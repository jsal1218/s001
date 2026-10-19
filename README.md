# S001 — personal dashboard

Static, no-build PWA hub (HTML/CSS/JS):

- `/` — Dash hub (tiles + live widgets), app registry in `apps.js`
- `/fitness/` — retired (DashFit was removed; this path just redirects to the hub, and the hub clears old DashFit data once)
- `/notes/`, `/finance/`, `/sim/` — retired (Dash Notes, Dash Finance and Promenade were removed; these paths redirect to the hub, and the hub deletes Notes and Finance on-device data once; Promenade stored none)
- `/nba/` — DashHoops scores (ESPN public scoreboard/summary API, CORS-enabled, no key)
- `/games/` — Dash Games: Orbit Merge (`orbit/`), Bloom Blocks (`bloom/`), Lantern Swipe (`lantern/`), Summit Stack (`summit/`), Reef Swap (`reef/`, match-3), Firefly Trail (`firefly/`, snake), Prism Paddle (`prism/`, brick breaker), Chess (`chess/`, vs Stockfish at 7 levels from Beginner 400 to Grandmaster 2500; own rules code in `rules.js`, engine is the self-hosted GPLv3 Stockfish.js 19 lite single-threaded WASM in `chess/engine/`, run in a Web Worker), Highway Rush (`racer/`, landscape real-3D highway racer in WebGL with a vendored three.js r186 subset in `racer/lib/` (MIT): CC0 Kenney Car Kit cars with clearcoat paint and brake lights, Kenney Nature Kit palms/rocks/bushes, procedural asphalt/grass textures, PMREM env lighting, soft sun shadows, ACES tone mapping, Graphics setting High/Medium/Low with auto-drop; models in `racer/models/` (credits in `racer/models/CREDITS.md`), cached on first use; gas/brake pedals, tilt or touch steering with calibrate, close-pass and 60+ mph bonuses, Fullscreen API with an iPhone Home Screen tip; settings in `dash-games-racer-prefs`); landing page has category filters, sections and a Recently played row; shared `games.css` + `common.js` (sound, haptics, best scores, overlay)
- `shared/` — design tokens (`base.css`, green/gold, light+dark), `theme.js` (applies saved theme before paint), `icons.svg` (UI icon sprite; use `DASH_ICON(name)` in JS), `update.js` (version + auto-update)
- `sw.js` — one service worker for the whole site (scope `/`), network-first for HTML/JS/JSON/CSS

## Adding an app
1. Create `/myapp/index.html` that loads `../shared/theme.js`, `../shared/base.css` and `../shared/update.js`.
2. Add an entry to `DASH_APPS` in `apps.js` (optional `widget(el)` for a live tile).
3. Optionally add its files to `PRE` in `sw.js` for offline use.

Live: https://jsal1218.github.io/s001/

## Deploying
Just `git commit` and `git push` to `main` (GitHub Pages serves the branch root).

A pre-commit hook stamps a unique version (UTC time + parent commit) into `sw.js` and `shared/update.js`,
which makes installed apps pick up the new service worker within ~a minute of opening/foregrounding.
After cloning, enable the hook once:

    git config core.hooksPath .githooks

(Or run `sh scripts/stamp-version.sh` manually before committing.) The current version is shown in the app footer.

## Credits

- Highway Rush 3D models: [Kenney Car Kit](https://kenney.nl/assets/car-kit) and [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) by Kenney (www.kenney.nl), CC0 1.0.
- Highway Rush renderer: [three.js](https://threejs.org) r186, MIT license (`games/racer/lib/LICENSE-three.txt`).
- Chess engine: [Stockfish.js](https://github.com/nmrugg/stockfish.js) 19 lite, GPLv3.
