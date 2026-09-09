const STATUS_LABELS = {
  operational: "Operational",
  maintenance: "Maintenance",
  degraded: "Degraded",
  outage: "Outage",
  unknown: "Unknown"
};

const PT_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

function formatPT(iso) {
  if (!iso) return "";
  try {
    return PT_FORMAT.format(new Date(iso)) + " PT";
  } catch {
    return iso;
  }
}

function worstStatus(components) {
  const order = ["outage", "degraded", "maintenance", "operational"];
  for (const level of order) {
    if (components.some((c) => c.status === level)) return level;
  }
  return "operational";
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function renderOverall(components) {
  const banner = document.getElementById("overall-banner");
  const text = document.getElementById("overall-text");
  const status = worstStatus(components);
  banner.dataset.status = status;
  const messages = {
    operational: "All systems operational",
    maintenance: "Maintenance in progress",
    degraded: "Degraded performance",
    outage: "Service outage"
  };
  text.textContent = messages[status] || "Status unknown";
}

function renderComponents(components) {
  const list = document.getElementById("component-list");
  list.dataset.state = "loaded";
  list.innerHTML = "";
  for (const c of components) {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="component-row" data-status="${c.status}">
        <div>
          <span class="component-name">${c.name}</span>
          <span class="component-desc">${c.description || ""}</span>
        </div>
        <div class="component-meta">
          <span class="status-label" data-status="${c.status}">${STATUS_LABELS[c.status] || c.status}</span>
          <span class="checked-at">Checked ${formatPT(c.checked_at)}${c.version ? ` &middot; v${c.version}` : ""}</span>
        </div>
      </div>`;
    list.appendChild(li);
  }
}

function renderMaintenance(items) {
  const list = document.getElementById("maintenance-list");
  list.dataset.state = "loaded";
  list.innerHTML = "";
  const now = Date.now();
  const upcoming = items
    .filter((m) => new Date(m.end).getTime() >= now)
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  if (upcoming.length === 0) {
    list.innerHTML = `<li class="row-empty">No maintenance currently scheduled.</li>`;
    return;
  }
  for (const m of upcoming) {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="maintenance-row">
        <div class="entry-title">${m.title}</div>
        <div class="entry-window">${formatPT(m.start)} &ndash; ${formatPT(m.end)}</div>
        <div class="entry-desc">${m.description || ""}</div>
      </div>`;
    list.appendChild(li);
  }
}

function renderIncidents(items) {
  const list = document.getElementById("incident-list");
  list.dataset.state = "loaded";
  list.innerHTML = "";

  if (items.length === 0) {
    list.innerHTML = `<li class="row-empty">No incidents reported.</li>`;
    return;
  }
  const sorted = [...items].sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  for (const inc of sorted.slice(0, 10)) {
    const li = document.createElement("li");
    const updates = (inc.updates || [])
      .map((u) => `<li><time>${formatPT(u.at)}</time>${u.text}</li>`)
      .join("");
    li.innerHTML = `
      <div class="incident-row" data-status="${inc.status}">
        <div class="entry-title">${inc.title}</div>
        <div class="entry-window">Started ${formatPT(inc.started_at)}${
          inc.resolved_at ? ` &middot; resolved ${formatPT(inc.resolved_at)}` : " &middot; ongoing"
        }</div>
        <ul class="entry-updates">${updates}</ul>
      </div>`;
    list.appendChild(li);
  }
}

async function init() {
  try {
    const [status, maintenance, incidents] = await Promise.all([
      loadJSON("data/status.json"),
      loadJSON("data/maintenance.json"),
      loadJSON("data/incidents.json")
    ]);

    renderOverall(status.components);
    renderComponents(status.components);
    renderMaintenance(maintenance);
    renderIncidents(incidents);

    document.getElementById("last-checked-footer").textContent =
      `Last checked ${formatPT(status.generated_at)}`;
  } catch (err) {
    console.error(err);
    document.getElementById("overall-text").textContent = "Status unavailable";
    document.getElementById("component-list").innerHTML =
      `<li class="row-empty">Could not load status data.</li>`;
  }
}

init();
