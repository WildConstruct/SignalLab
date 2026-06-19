# Signal Lab Presentation Gap Audit

**Status date:** 2026-06-19

The demo suite is healthy as an engineering playground, but the buyer-facing
story needs a tighter route. These are the presentation holes to close before
using the gallery as a launch or investor proof surface.

## What Works

- The launcher presents nine modules with animated signal thumbnails.
- The seven product demos share a consistent Structure / Signal / Shaping UI.
- Field Bridge proves Signal Rack driving a real Etheros field engine.
- Field Distort proves the inverse: an Etheros field distorting another visual
  instrument while Signal Rack pulses the warp.
- Import/export, presets, surprise, and AE expression copy exist across demos.

## Holes To Close

### 1. "Take It To AE" Needs Clear Labels

The shared `ƒ AE` button exports a self-contained expression for the signal
driver, not the full rendered FUI/type/particle instrument. That is valuable, but
the UI/docs should label it as **driver expression export** unless a demo can
export the rendered component itself.

Recommendation:
- Button/tooltips: "Copy driver expression".
- Docs: distinguish Signal Rack driver export from future plugin-let/component
  export.

### 2. The Retro Logo Machine Needs Imported Media

Glitch / Distortion and Field Distort currently use procedural cards/plates.
They prove the engine idea, but the strongest visual pitch is "bring your own
logo/image and let the signal/field corrupt it."

Recommendation:
- Add image import to Field Distort first.
- Then route the imported image through chroma split, displacement, heat rise,
  and dropout.
- Make a preset called `Logo Machine` or `Sensor Logo Warp`.

### 3. Gallery Needs A Guided Proof Route

The current gallery is a buffet. A buyer or investor should see a deliberate
sequence:

1. **Signal Rack driver**: Path & Scope or the main `tool/` shows the signal.
2. **Curated instrument**: FUI Kit Processor Die or Neural Net shows signal
   mapped onto structure.
3. **Reusable engine proof**: Field Bridge shows Signal Rack driving Etheros.
4. **Real media proof**: Field Distort/Glitch with imported logo closes the
   "production object" story.

Recommendation:
- Add a short "Presentation route" section to `demos/README.md` or the gallery
  footer.
- Do not add a marketing landing page; keep the gallery as the first surface.

### 4. Native Credibility Badges Are Missing

The demos mix several maturity levels:

- Signal engine: WGSL + CPU reference parity.
- Etheros field: WebGPU slice + CPU fallback.
- AE plugin: scaffold/contract only.
- AE expression export: driver-only and plugin-free.

Recommendation:
- Add or document badges such as `WGSL parity`, `WebGPU field`, `CPU fallback`,
  `AE scaffold`, `driver expression`.
- Avoid saying "the AE plugin does this" unless the AE SDK/Dawn path has been
  run in-app.

### 5. Visual QA Should Produce Screenshots

HTTP 200 and JS syntax checks catch broken paths, but these demos are canvas
products. A blank canvas is a release blocker even if every request succeeds.

Recommendation:
- Use the repo-local `.claude/skills/run-demos/drive.mjs` harness for screenshot
  checks.
- Cover all nine modules.
- Save screenshots to a temp/artifact folder and inspect them before using a demo
  in a presentation.

## Recommended Next Demo Slice

If the next slice must improve presentation value rather than engine depth:

1. Add imported-image target to `field-distort`.
2. Add a gallery "proof route" that links `tool/`, `fui-kit`, `field-bridge`,
   and `field-distort`.
3. Rename `ƒ AE` copy affordance to make clear it copies the driver expression.

This closes the biggest buyer-facing hole while keeping the core engine roadmap
unchanged.
