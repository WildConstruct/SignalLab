---
name: run-demos
description: Launch the Signal Rack web demo suite (demos/) and view it in a real browser. Use when asked to run, open, "bring up", or screenshot the demos / the demo lab / a specific demo, or to confirm a demo renders and animates.
---

# Run the Signal Rack demo suite

The demos are dependency-free static HTML/JS under `demos/`. They load the
shared engine via paths relative to the **repo root**, so the server must be
started there. "Running" them means: serve the repo, drive a headless Chromium,
and screenshot — a blank frame is a failure to launch.

## 1 · Serve the repo root

```bash
# from the repo root; use a background task so it persists
python3 -m http.server 8123
# wait for it (don't sleep blindly):
timeout 15 bash -c 'until curl -sf http://127.0.0.1:8123/demos/ >/dev/null; do sleep 0.5; done'
```

The launcher is `/demos/`; each demo is `/demos/<name>/` (fui-kit,
glitch-distortion, transitions, kinetic-type, meters, particles, path-scope).

## 2 · Browser: use the PRE-CACHED Chromium

The Playwright CDN (`cdn.playwright.dev`) is **blocked by the network egress
policy**, so `npx playwright install chromium` fails with 403. Do NOT try to
download a browser. A usable build is already cached on the image:

```
/opt/pw-browsers/chromium-1194/chrome-linux/chrome
```

Install just the Playwright *library* (no browser) and drive that binary via
`executablePath`. Launch flags that matter in this container:
`--no-sandbox --use-gl=swiftshader --enable-unsafe-swiftshader` (canvas needs a
GL fallback; without it some pages paint blank).

```bash
cd /tmp && npm i playwright@latest >/dev/null 2>&1   # library only; browser is cached
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node /tmp/drive.mjs
```

## 3 · Driver

A ready driver lives next to this skill: [`drive.mjs`](drive.mjs). It opens the
launcher + four demos, waits ~1.5s so the `requestAnimationFrame` loop paints,
screenshots each to `/tmp/shots/`, and reports painted-pixel counts + console
errors. Edit the `pages` array to target other demos. Run it, then **look at the
screenshots** (`/tmp/shots/*.png`).

## 4 · Stop

```bash
pkill -f 'http.server 8123'   # or TaskStop the background task
```

## Gotchas that recur
- **Serve from the repo root**, not `demos/` — the pages reference
  `../prototypes/webgpu-lab/signal-core-reference.js`.
- **`playwright` is CommonJS** under ESM: `import pkg from 'playwright'; const { chromium } = pkg;`
- **Lone `favicon.ico` 404** on the launcher is harmless; ignore it.
- **Verify it actually drew** — check painted-pixel count / screenshot, not just
  that `goto` resolved. The demos animate via canvas, so give them a beat first.
