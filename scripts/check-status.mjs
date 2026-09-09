// Polls MIDAS endpoints server-side (via GitHub Actions) and writes data/status.json.
// Runs outside the browser, so there's no CORS restriction here -- only the
// static site's own client-side fetch of this JSON file needs to be same-origin.

import { writeFile, readFile } from "node:fs/promises";

// TODO: replace with real MIDAS endpoints to check.
const COMPONENTS = [
  {
    id: "public-api",
    name: "Public API",
    description: "GET endpoints for rate, GHG, and Flex Alert data",
    url: "https://midasapi.energy.ca.gov/health",
    timeoutMs: 8000
  },
  {
    id: "jobs-endpoint",
    name: "Async /jobs endpoint",
    description: "Async job submission and polling",
    url: "https://REPLACE-WITH-MIDAS-API-HOST/jobs", // placeholder
    timeoutMs: 8000
  },
  {
    id: "docs",
    name: "Documentation",
    description: "API reference and integration guides",
    url: "https://REPLACE-WITH-DOCS-URL", // placeholder
    timeoutMs: 8000
  }
];

async function checkOne(component) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), component.timeoutMs);
    const res = await fetch(component.url, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "midas-status-checker", Accept: "application/json" }
    });
    clearTimeout(timer);
    const latency_ms = Date.now() - started;

    // Start from the HTTP status code as a baseline signal.
    let status = "operational";
    if (res.status >= 500) status = "outage";
    else if (res.status >= 400) status = "degraded";
    else if (latency_ms > 5000) status = "degraded";

    // If the endpoint returns a JSON health body (e.g. {"status":"healthy", ...}),
    // prefer that over the bare status code -- a 200 can still report itself unhealthy.
    let version;
    try {
      const body = await res.clone().json();
      if (typeof body?.version === "string") version = body.version;
      if (typeof body?.status === "string") {
        const b = body.status.toLowerCase();
        if (["healthy", "ok", "operational", "up"].includes(b)) {
          status = latency_ms > 5000 ? "degraded" : "operational";
        } else if (["degraded", "warn", "warning"].includes(b)) {
          status = "degraded";
        } else if (["unhealthy", "down", "outage", "error"].includes(b)) {
          status = "outage";
        }
      }
    } catch {
      // Not JSON, or no body -- fall back to the status-code check above.
    }

    return { ...component, status, latency_ms, version, checked_at: new Date().toISOString() };
  } catch (err) {
    return {
      ...component,
      status: "outage",
      latency_ms: null,
      checked_at: new Date().toISOString(),
      error: String(err)
    };
  }
}

function stripInternal(component) {
  const { url, timeoutMs, error, ...rest } = component;
  return rest;
}

async function main() {
  const results = await Promise.all(COMPONENTS.map(checkOne));

  const overall = results.some((c) => c.status === "outage")
    ? "outage"
    : results.some((c) => c.status === "degraded")
    ? "degraded"
    : "operational";

  const payload = {
    generated_at: new Date().toISOString(),
    overall,
    components: results.map(stripInternal)
  };

  await writeFile("data/status.json", JSON.stringify(payload, null, 2) + "\n");

  // Log a one-line summary for the Actions log.
  console.log(`overall=${overall} ` + results.map((c) => `${c.id}=${c.status}`).join(" "));
}

main();
