# MIDAS status page

A static status page for MIDAS, hosted on GitHub Pages. A scheduled GitHub
Actions workflow checks MIDAS server-side (no CORS involved) and commits the
result as `data/status.json`, which the page fetches from its own origin.

## Setup

1. **Create the repo** and push this folder's contents to it (`main` branch, root).

2. **Enable GitHub Pages**
   Repo Settings -> Pages -> Build and deployment -> Source: "Deploy from a
   branch" -> Branch: `main`, folder `/ (root)`. Save. Your page will be at
   `https://YOUR-ORG.github.io/YOUR-REPO/`.

3. **Point the health checks at real MIDAS endpoints**
   Edit `scripts/check-status.mjs` and replace the two placeholder `url`
   values with real MIDAS endpoints you want monitored (a lightweight
   public GET route for the API, and your docs URL).

4. **Turn on the scheduled check**
   The workflow at `.github/workflows/check-status.yml` runs every 5 minutes
   once it's on `main` (GitHub Actions schedules only run off the default
   branch). You can also trigger it manually from the Actions tab
   ("Run workflow") to test it immediately rather than waiting 5 minutes.

5. **Fill in the About section links**
   In `index.html`, replace the four `href="#"` placeholders in the About
   section with your real docs, GitHub repo, release notes, and contact links.

6. **Wire up subscriptions**
   The form in `index.html` posts to a placeholder Buttondown URL. Pick one:
   - **Email signup service** (Buttondown, ConvertKit, Mailchimp): create a
     free account, get your embed form action URL, and swap it into the
     `action="..."` attribute on `#subscribe-form`.
   - **GitHub Releases as the feed**: for the "API changes" / "doc updates"
     categories specifically, you can just point people at watching this
     repo's Releases instead of building your own send pipeline.
   - **Actions-triggered send**: if you want the workflow itself to notify
     subscribers on status changes, add a `NOTIFY_API_KEY` repo secret
     (Settings -> Secrets and variables -> Actions) for your email provider,
     write a small `scripts/notify-subscribers.mjs`, and uncomment the
     commented-out step at the bottom of `check-status.yml`.

7. **Edit maintenance and incidents**
   `data/maintenance.json` and `data/incidents.json` are edited by hand (or by
   another small script) — they aren't touched by the automated check.
   Replace the example entries with real ones, or clear them to empty arrays
   (`[]`) if there's nothing to show yet.

## Files

```
index.html                        the page itself
assets/styles.css                 styling
assets/script.js                  fetches the three JSON files and renders them
data/status.json                  live component status (overwritten by the workflow)
data/maintenance.json             upcoming maintenance windows (hand-edited)
data/incidents.json               incident history (hand-edited)
scripts/check-status.mjs          the health-check script the workflow runs
.github/workflows/check-status.yml  the scheduled Actions workflow
```
