# SignalLab Cleanup And Roadmap Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the repo truth cleanup, schema/contract alignment, demo verification story, engine roadmap, and Notion-style build log update requested after the SignalLab reconnaissance pass.

**Architecture:** Keep the browser demo suite and native Signal Rack path distinct: docs state maturity clearly, schemas describe the portable contract, and verification separates engine parity, syntax, HTTP reachability, and visual smoke. Commits are scoped so each packet can be reviewed or reverted independently.

**Tech Stack:** Static HTML/JS demos, WGSL, C++ headers, JSON Schema draft-07, CMake, PowerShell/Python HTTP smoke, Node validators, Notion build-log page.

---

## File Structure

- `docs/superpowers/plans/2026-06-19-signallab-cleanup-roadmap-landing.md`: this execution plan.
- `README.md`, `docs/STATUS.md`, `IMPLEMENTATION-REPORT.md`: top-level truth pass for current branch, validation counts, demo count, AE/native maturity, and local verification commands.
- `demos/README.md`, `docs/product-breakup.md`, `docs/web-demos/README.md`, `docs/web-demos/BACKLOG.md`: demo suite cleanup from seven demos to nine modules, plus current branch/log state.
- `demos/*/README.md`: update stale MVP language for the demos that now have more variants.
- `shaders/signal_core.wgsl`, `core/signal_runtime_config.h`, `plugins/after-effects/signalrack_bridge.h`, `plugin/SignalRackPlugin/README.md`, `plugin/SignalRackPlugin/SignalRackPlugin.cpp`: align comments around the 44-float uniform layout and output-publishing reality.
- `schemas/signal-rack-recipe.schema.json`, `schemas/examples/*.json`: expand the recipe schema to match current process/window/sidechain/z/tool-private export fields.
- `docs/engine-roadmap.md`: concise gap/roadmap packet for native engine, AE, component manifest, and demo productization.
- `docs/web-demos/presentation-gap-audit.md`: buyer-facing demo holes and proof beats.
- `docs/web-demos/visual-smoke.md`, `.claude/skills/run-demos/drive.mjs`, `.claude/skills/run-demos/SKILL.md`: document and broaden visual smoke checks across all nine demo modules.
- `docs/notion-build-log/2026-06-19-cleanup-roadmap-landing.md`: local Notion-style log entry mirroring the Signal Rack Build Log format before updating Notion.

## Notion Rule

Use the existing Signal Rack Notion page `Signal Rack — Web Demos (Engineering)` as the target. Append one newest-first Build Log entry under `## Build Log` with: date, scoped landing summary, commit range, verification evidence, and follow-up lane. This mimics the Entropy-style pattern found in the `Entropy Builds` database and the Signal Rack page: short title, concise build outcome, exact commits, exact verification.

## Commit Plan

1. `docs: add cleanup roadmap landing plan`
2. `docs: refresh SignalLab repo truth`
3. `schema: align signal recipe contract`
4. `docs: add engine roadmap and demo gap audit`
5. `test: document nine-demo visual smoke`
6. `docs: log cleanup landing for Notion`

## Tasks

### Task 1: Plan Artifact

**Files:**
- Create: `docs/superpowers/plans/2026-06-19-signallab-cleanup-roadmap-landing.md`

- [ ] **Step 1: Create this plan**

Write the durable plan with file scope, Notion target, commit boundaries, and verification commands.

- [ ] **Step 2: Verify plan exists**

Run: `Test-Path docs\superpowers\plans\2026-06-19-signallab-cleanup-roadmap-landing.md`

Expected: `True`

- [ ] **Step 3: Commit**

Run:

```powershell
git add docs/superpowers/plans/2026-06-19-signallab-cleanup-roadmap-landing.md
git commit -m "docs: add cleanup roadmap landing plan"
```

### Task 2: Repo Truth Cleanup

**Files:**
- Modify: `README.md`
- Modify: `docs/STATUS.md`
- Modify: `IMPLEMENTATION-REPORT.md`
- Modify: `demos/README.md`
- Modify: `docs/product-breakup.md`
- Modify: `docs/web-demos/README.md`
- Modify: `docs/web-demos/BACKLOG.md`
- Modify: `demos/fui-kit/README.md`
- Modify: `demos/glitch-distortion/README.md`
- Modify: `demos/transitions/README.md`
- Modify: `demos/kinetic-type/README.md`
- Modify: `demos/meters/README.md`
- Modify: `demos/particles/README.md`
- Modify: `demos/path-scope/README.md`

- [ ] **Step 1: Replace stale validation and demo-count claims**

Update `15/15` and `10/10` references to the current `30/30` engine-reference result. Replace "seven-demo suite" where it describes the current launcher with "nine-module suite" or "seven product demos plus two field-convergence demos."

- [ ] **Step 2: Make maturity labels explicit**

State that browser demos are current executable proof; native AE remains contract/scaffold until AE SDK plus Dawn verification. Keep the WGSL/Dawn engine path as the intended product path.

- [ ] **Step 3: Update stale demo READMEs**

Remove MVP-only language where variants now exist. Mention current variants and the `Structure / Signal / Shaping` contract for each module.

- [ ] **Step 4: Verify stale claims are gone**

Run:

```powershell
rg -n "seven-demo suite|10/10|15/15|MVP ships|MVP:|Roadmap in" README.md IMPLEMENTATION-REPORT.md docs demos
```

Expected: no stale references in current-state docs; historical backlog headings may remain only where they describe completed phases.

- [ ] **Step 5: Commit**

Run:

```powershell
git add README.md docs/STATUS.md IMPLEMENTATION-REPORT.md demos/README.md docs/product-breakup.md docs/web-demos/README.md docs/web-demos/BACKLOG.md demos/*/README.md
git commit -m "docs: refresh SignalLab repo truth"
```

### Task 3: Contract And Native Comment Alignment

**Files:**
- Modify: `shaders/signal_core.wgsl`
- Modify: `core/signal_runtime_config.h`
- Modify: `plugins/after-effects/signalrack_bridge.h`
- Modify: `plugin/SignalRackPlugin/README.md`
- Modify: `plugin/SignalRackPlugin/SignalRackPlugin.cpp`

- [ ] **Step 1: Fix uniform layout comments**

Replace `float[36]` / `36 scalars` wording with the current 44-float / 11-vec4 layout.

- [ ] **Step 2: Align AE output publishing comments**

Describe Output A/B/C as sliders used by bake or expression/courier bridge, not as values directly written by `Render()` every frame.

- [ ] **Step 3: Verify wording**

Run:

```powershell
rg -n "float\[36\]|36 scalars|plugin WRITES each frame|Render\(\).*publish|writes.*Output" shaders core plugins plugin
```

Expected: no misleading current-claim matches.

- [ ] **Step 4: Commit**

Run:

```powershell
git add shaders/signal_core.wgsl core/signal_runtime_config.h plugins/after-effects/signalrack_bridge.h plugin/SignalRackPlugin/README.md plugin/SignalRackPlugin/SignalRackPlugin.cpp
git commit -m "docs: align native output contract notes"
```

### Task 4: Recipe Schema Alignment

**Files:**
- Modify: `schemas/signal-rack-recipe.schema.json`
- Modify: `schemas/examples/09-undulating-ray.json`

- [ ] **Step 1: Extend `process` schema**

Add current fields: `gain`, `bias`, `quantize`, `quantizeSteps`, `gate`, `lag`, `warp`, `fold`, `sat`, `invert`, `rectify`, `winLeft`, `winRight`, `winFeatherL`, `winFeatherR`, `zDepth`, `modTarget`, `modDepth`, `threshold`, `hysteresis`.

- [ ] **Step 2: Add tool-private fields**

Document `_channelY`, `_drive`, and `_tool` as Signal Lab authoring/export metadata so current exports validate without pretending those fields are native plugin contract.

- [ ] **Step 3: Validate JSON syntax**

Run:

```powershell
Get-ChildItem schemas -Recurse -Filter *.json | ForEach-Object { node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" $_.FullName }
```

Expected: exit code 0.

- [ ] **Step 4: Commit**

Run:

```powershell
git add schemas/signal-rack-recipe.schema.json schemas/examples/09-undulating-ray.json
git commit -m "schema: align signal recipe contract"
```

### Task 5: Roadmap And Demo Gap Packet

**Files:**
- Create: `docs/engine-roadmap.md`
- Create: `docs/web-demos/presentation-gap-audit.md`

- [ ] **Step 1: Write engine roadmap**

Include immediate gates: Dawn build, AE one-rack-to-one-property bake, live courier proof, luma probe, temporal state buffers, manifest/compiler lane, first consumer proof.

- [ ] **Step 2: Write presentation gap audit**

Include holes: demo-to-AE labeling, imported media for logo machine, guided buyer route, native credibility badges, visual smoke evidence.

- [ ] **Step 3: Commit**

Run:

```powershell
git add docs/engine-roadmap.md docs/web-demos/presentation-gap-audit.md
git commit -m "docs: add engine roadmap and demo gap audit"
```

### Task 6: Visual Smoke Documentation

**Files:**
- Create: `docs/web-demos/visual-smoke.md`
- Modify: `.claude/skills/run-demos/drive.mjs`
- Modify: `.claude/skills/run-demos/SKILL.md`

- [ ] **Step 1: Expand the screenshot driver page list**

Update `drive.mjs` so it targets launcher plus all nine modules: FUI Kit, Glitch, Transitions, Kinetic Type, Meters, Particles, Path & Scope, Field Bridge, Field Distort.

- [ ] **Step 2: Add visual smoke docs**

Document the local HTTP smoke, Node syntax check, and optional Playwright screenshot path. Include Windows notes for detached Python limitations.

- [ ] **Step 3: Verify local checks**

Run:

```powershell
node prototypes\webgpu-lab\validate.js
node prototypes\webgpu-lab\codec-validate.js
$files = rg --files -g '*.js' demos tool prototypes; foreach ($f in $files) { node --check $f | Out-Null; if ($LASTEXITCODE -ne 0) { throw "node --check failed: $f" } }
```

Expected: `30 passed, 0 failed`; `8 passed, 0 failed`; all JS checks exit 0.

- [ ] **Step 4: Commit**

Run:

```powershell
git add docs/web-demos/visual-smoke.md .claude/skills/run-demos/drive.mjs .claude/skills/run-demos/SKILL.md
git commit -m "test: document nine-demo visual smoke"
```

### Task 7: Notion Log And Push

**Files:**
- Create: `docs/notion-build-log/2026-06-19-cleanup-roadmap-landing.md`

- [ ] **Step 1: Write local Notion-style log entry**

Use the Signal Rack Build Log format: newest-first date, scoped landing summary, commits, verification, and next lane.

- [ ] **Step 2: Update Notion Signal Rack page**

Append the same entry under `## Build Log` on `Signal Rack — Web Demos (Engineering)` using `notion-update-page` if the tool accepts the conservative Markdown update.

- [ ] **Step 3: Final verification**

Run:

```powershell
git status --short --branch
node prototypes\webgpu-lab\validate.js
node prototypes\webgpu-lab\codec-validate.js
```

Expected: clean branch after commits; validators pass.

- [ ] **Step 4: Commit and push**

Run:

```powershell
git add docs/notion-build-log/2026-06-19-cleanup-roadmap-landing.md
git commit -m "docs: log cleanup landing for Notion"
git push origin claude/signal-lab-product-analysis-8x6oxk
```

## Final Acceptance Criteria

- The repo no longer overstates native AE maturity or demo count.
- Current browser/demo verification commands are documented and fresh.
- Signal recipe schema matches current exported fields.
- The engine roadmap and demo gap audit are durable repo docs.
- Notion Build Log has a newest-first entry or a local Notion log artifact records why direct Notion update was blocked.
- The branch contains a series of scoped commits and is pushed.
