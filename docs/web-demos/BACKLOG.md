# Web Demos — Build Backlog (loop-consumable)

> **For the overnight build loop.** Each run: pick the **first unchecked `[ ]`
> item**, implement *only that item*, verify it loads (`python3 -m http.server`
> + sanity), check it off (`[x]`) with a one-line note, commit + push, and append
> a dated line to the Notion dev log (Engineering Notes → Signal Rack →
> Build Log). Do ONE item per run — keep increments small. If an item is
> ambiguous or needs a product decision, leave it unchecked, add a `> NOTE:` and
> move to the next independent item.

Order matters: Phase 0 (shared foundation) unblocks everything; then each demo
gets a thin MVP slice before any demo gets polish. Build breadth first.

---

## Phase 0 — Shared foundation (unblocks all demos)
- [x] `demos/shared/signal-engine.js` — driver wrapping two `SignalCore.Rack` channels + the exact `combine()` modes; exposes `sample/window/set/fromRecipe`. Node-verified against the parity engine. (`toExpression` deferred to Phase 4.)
- [ ] `demos/shared/host.js` — boot + render loop + canvas sizing + engine badge + copy-link/export-JSON/import (lift from `tool/index.html`).
- [ ] `demos/shared/controls.js` — three-tier panel kit (Structure / Signal / Shaping), sliders w/ double-click-reset, dropdowns, Signal-source selector, math drawer.
- [ ] `demos/shared/style.css` — shared palette/typography extracted from `tool/index.html`.
- [ ] `demos/index.html` — a launcher page linking all seven demos (the "Lab" gallery).
- [ ] Verify foundation: a throwaway `demos/_smoke/` page mounts host+controls and animates `driver.sample(t).n` on a canvas. Delete once a real demo exists.

## Phase 1 — One thin MVP per demo (breadth first)
*Each: scaffold `index.html` + `render.js` + `presets.js` + `README.md`; render
the structure statically; animate it with the built-in driver through ONE
shaping mapping; one preset. Port from the named `drawApplied()` cases.*
- [ ] **FUI Kit** MVP — start with Synapse net (port `fuiSynapse`): seed→node count + connectivity (Structure), activation in background (Signal), `Fire ≥` threshold (Shaping).
- [ ] **Glitch / Distortion** MVP — RGB-split + scanline displacement on a built-in test card; signal drives horizontal sync drift + chroma phase. (Port the Cathode/`crt` wiring + Visual cases.)
- [ ] **Transitions** MVP — loading bar with monotonic signal-shaped pace (port `trLoad`) + sweep playhead.
- [ ] **Kinetic Type** MVP — per-letter wave/stagger on a word (port `type`/`trText`); signal drives the rise.
- [ ] **Meters** MVP — bar meter + gate (port `meter`) with a fill response curve.
- [ ] **Particles** MVP — fountain emitter (port `particles`): signal → birth-rate spikes + spread.
- [ ] **Path & Scope** MVP — wave-runner (port `trace`): object rides the raw `bufX` waveform; head dot tracks the live value.

## Phase 2 — Fill each demo's structure + shaping (breadth first, one slice each)
- [ ] FUI Kit — add Data packets (`fuiPackets`) + Processor die (`fuiCore`); widget picker; lane/grid-size controls.
- [ ] Glitch — add block displacement from an imported image (the "retro logo machine"); displacement-scale control.
- [ ] Transitions — add wipe + radial-fill + text-reveal variants; easing control.
- [ ] Kinetic Type — add shake-on-peak + RGB-glitch threshold variants.
- [ ] Meters — add radial gauge + LED ladder; segment count + redline gate.
- [ ] Particles — add shock rings (burst threshold) + stream field (density).
- [ ] Path & Scope — add vectorscope dot + spirograph + rose (turns/radius controls).

## Phase 3 — Shaping depth (the "subtle" layer) across demos
- [ ] Add the shared **field-mapping** selector (uniform / sweep / radial / stagger) to `controls.js` and wire it into every demo's render.
- [ ] Add the shared **response** controls (0→100 remap curve, gamma/ease, peak-hold) and apply per demo.
- [ ] FUI Kit — edge-propagation speed + per-node phase stagger (sequenced firing).
- [ ] Glitch — dropout-gate + pixel-sort threshold + sort-axis.
- [ ] Equalizer (FUI/Meters) — per-band offset → travelling wave across bands.
- [ ] Radar (FUI) — signal → blip bearing/range + sweep speed.

## Phase 4 — Suite cohesion & handoff
- [ ] Every demo: External-signal source — import a recipe/link from Signal Lab; verify round-trip.
- [ ] Every demo: 3–5 tasteful presets + `🎲 Surprise`.
- [ ] Every demo: copy the self-contained AE expression for its primary mapping (reuse `driver.toExpression`).
- [ ] `demos/index.html` gallery polish + per-demo thumbnails.
- [ ] Cross-link demos ↔ `docs/product-breakup.md` and the Notion sub-project.

---

### Loop bookkeeping
- Branch: `claude/signal-lab-product-analysis-8x6oxk` (current PR #4).
- Keep commits scoped to one backlog item; prefix `demos:`.
- If `tool/index.html` source is needed for a port, read the relevant
  `drawApplied()` case — do not duplicate the whole file.
- After each item, update this file's checkbox + the Notion Build Log.
