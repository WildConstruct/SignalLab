# Signal Lab Visual Smoke

**Status date:** 2026-06-19

Use this checklist before presenting the demo gallery or claiming that the
browser product surface is healthy. Engine validation, JavaScript syntax, HTTP
reachability, and visual canvas proof catch different failures.

## 1. Engine Contract

```powershell
node prototypes\webgpu-lab\validate.js
node prototypes\webgpu-lab\codec-validate.js
```

Expected result:

- `validate.js`: 30 passed, 0 failed
- `codec-validate.js`: 8 passed, 0 failed

## 2. JavaScript Syntax

```powershell
$files = rg --files -g '*.js' demos tool prototypes
foreach ($f in $files) {
  node --check $f | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "node --check failed: $f" }
}
"node --check OK for $($files.Count) JS files"
```

Expected current coverage: 36 JS files.

## 3. Static HTTP Reachability

Run the server from the repo root. In the Codex desktop containment, detached
PowerShell children can exit early, so the most reliable local smoke is one
foreground server and one request loop.

Terminal 1:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Terminal 2:

```powershell
$pages = @(
  '/demos/',
  '/demos/fui-kit/',
  '/demos/glitch-distortion/',
  '/demos/transitions/',
  '/demos/kinetic-type/',
  '/demos/meters/',
  '/demos/particles/',
  '/demos/path-scope/',
  '/demos/field-bridge/',
  '/demos/field-distort/',
  '/tool/'
)

foreach ($page in $pages) {
  $res = Invoke-WebRequest -UseBasicParsing -Uri ('http://127.0.0.1:8765' + $page)
  "{0} {1} {2}" -f $page, [int]$res.StatusCode, $res.RawContentLength
}
```

Expected result: every path returns HTTP 200.

## 4. Screenshot Smoke

HTTP 200 is not enough for the demos, because the meaningful output is canvas
painting. The repo-local driver opens the launcher plus all nine modules,
captures screenshots, counts painted pixels, and reports console/page errors.

In environments with the cached Linux Chromium:

```bash
cd /tmp && npm i playwright@latest >/dev/null 2>&1
REPO=/path/to/SignalRack
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node "$REPO/.claude/skills/run-demos/drive.mjs" \
  http://127.0.0.1:8123/demos
```

If running from this Windows checkout, use the equivalent absolute path to
`.claude/skills/run-demos/drive.mjs` and a Playwright-compatible Chromium.

Always inspect `/tmp/shots/*.png` before a presentation. A blank screenshot is a
release blocker even if the HTTP and syntax checks pass.

## Current Demo Coverage

- launcher
- `fui-kit`
- `glitch-distortion`
- `transitions`
- `kinetic-type`
- `meters`
- `particles`
- `path-scope`
- `field-bridge`
- `field-distort`
