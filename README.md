# S001 — personal dashboard

Static, no-build PWA hub (HTML/CSS/JS):

- `/` — Dash hub (tiles + live widgets), app registry in `apps.js`
- `/fitness/` — retired (DashFit was removed; this path just redirects to the hub, and the hub clears old DashFit data once)
- `/notes/`, `/finance/`, `/sim/` — retired (Dash Notes, Dash Finance and Promenade were removed; these paths redirect to the hub, and the hub deletes Notes and Finance on-device data once; Promenade stored none)
- `/nba/` — DashHoops scores (ESPN public scoreboard/summary API, CORS-enabled, no key)
- `/games/` — Dash Games: Orbit Merge (`orbit/`), Paper Pilot (`pilot/`), Bloom Blocks (`bloom/`), Glimmer Guard (`glimmer/`, hand-rolled WebGL first-person arena), Lantern Swipe (`lantern/`), Summit Stack (`summit/`), Reef Swap (`reef/`, match-3), Firefly Trail (`firefly/`, snake), Prism Paddle (`prism/`, brick breaker), Meadow Sweep (`meadow/`, logic sweeper), Pebble Putt (`putt/`, mini golf), Canopy Run (`canopy/`, endless runner), Crestline Rally (`crestline/`, hill stunt driver with garage, daily streak, local leaderboard and clearly labeled ad/IAP mockups; see `games/crestline/GODOT_PORT.md`); landing page has category filters, sections and a Recently played row; shared `games.css` + `common.js` (sound, haptics, best scores, overlay)
- `shared/` — design tokens (`base.css`, green/gold, light+dark), `theme.js` (applies saved theme before paint), `icons.svg` (UI icon sprite; use `DASH_ICON(name)` in JS), `update.js` (version + auto-update)
- `sw.js` — one service worker for the whole site (scope `/`), network-first for HTML/JS/JSON/CSS

## Adding an app
1. Create `/myapp/index.html` that loads `../shared/theme.js`, `../shared/base.css` and `../shared/update.js`.
2. Add an entry to `DASH_APPS` in `apps.js` (optional `widget(el)` for a live tile).
3. Optionally add its files to `PRE` in `sw.js` for offline use.

Live: Live: https://jsal1218.github.io/ironman-tracker/

## Deploying
Just `git commit` and `git push` to `main` (GitHub Pages serves the branch root).

A pre-commit hook stamps a unique version (UTC time + parent commit) into `sw.js` and `shared/update.js`,
which makes installed apps pick up the new service worker within ~a minute of opening/foregrounding.
After cloning, enable the hook once:

    git config core.hooksPath .githooks

(Or run `sh scripts/stamp-version.sh` manually before committing.) The current version is shown in the app footer.
