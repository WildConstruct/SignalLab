# Signal Lab — Web Demos: Implementation Plans

> Companion to `docs/product-breakup.md`. That doc argues *why* the monolithic
> `tool/` should split into per-product demos along the signal/render seam. This
> folder is the *how*: one shared signal-engine core + seven standalone product
> demos, each a renderer exposing the **Structure / Signal / Shaping** control
> triad. The current gallery also includes two Etheros convergence demos
> (`field-bridge`, `field-distort`) that prove signal↔field composition.
> These plans are written to be executed incrementally by the overnight build
> loop (see `BACKLOG.md`).

---

## The shared foundation

Every demo is a thin renderer over **one shared module**, extracted from the
existing CPU reference so all demos stay bit-parity with the WGSL product engine.

### `demos/shared/signal-engine.js`
A UMD module re-exporting `SignalCore` (today `prototypes/webgpu-lab/signal-core-reference.js`)
plus a small **driver** wrapper that reproduces the web tool's full chain:

```
Channel X/Y (src, rate, phase, amount, offset, smooth, seed)
  → processor (gain/bias/saturate/warp/fold/gate/quantize/lag/invert/rectify)
  → window (feathered region)        → sidechain (AM/FM/phase)  → distort
  → drive combine (X · Y · X×Y · mix · diff · min · max)
  → normalized scalar  n ∈ [0,1]   +   raw buffers  bufX[], bufY[]
```

The driver's public surface — **the entire contract every renderer consumes**:

| Call | Returns | Use |
|---|---|---|
| `driver.sample(t)` | `{ n, x, y }` | the live combined value + raw channels at time `t` |
| `driver.window(t, N)` | `{ bufX:[…N], bufY:[…N], n }` | a scope window of N samples back from `t` |
| `driver.fromRecipe(json)` | driver | load a `.wcx` / recipe-JSON setup |
| `driver.toExpression(range)` | string | the self-contained AE expression (reuse tool's emitter) |

> This is identical to what the AE plugin publishes as Output A/B/C and what the
> recipe JSON already carries — so a look authored in any demo is portable to the
> plugin unchanged. **No renderer ever does signal math itself.**

### `demos/shared/controls.js`
The reusable control-panel kit implementing the three-tier UI (below), so every
demo gets the same look/UX for free: labeled sliders (double-click resets),
dropdowns, a pick-whip-style "Signal source" selector, and the math drawer.

### `demos/shared/host.js`
Boot/render loop, canvas sizing, the engine badge (WebGPU vs CPU reference),
record-video, copy-link / export-JSON / import, and `?`-guide plumbing — all
lifted from `tool/index.html` so demos are ~render-function-only.

### The three-tier control contract (every demo implements this)

1. **Structure** — static identity of the instrument. *grid size, rows/cols,
   node count, edge density, shape, complexity, lane/band count, seed, palette.*
   Off-signal the structure still looks intentional (sells standalone).
2. **Signal** — the driver in the background. A **Signal source** selector:
   *Built-in* (the demo's own lightweight driver, default on) or *External*
   (a recipe/link from Signal Rack / Signal Lab). Empty/static is valid.
3. **Shaping** — the subtle mappers: **field mapping** (uniform / sweep across
   structure / radial / per-element stagger), **response** (0→100 remap,
   `Fire ≥` threshold, gamma/ease, peak-hold), **depth/amount** (subtle by
   default), **target** (which aspect the signal touches).

---

## Demo skeleton (what the loop scaffolds for each)

```
demos/<name>/
  index.html          # imports shared/{signal-engine,controls,host}.js; mounts panel + canvas
  render.js           # the ONLY bespoke file: draw(ctx, W, H, { n, bufX, bufY, structure, shaping })
  presets.js          # 3–5 tasteful starting points
  README.md           # one-screen "what it is / controls / how the signal drives it"
```

A demo MVP is "done" when: it renders its structure statically, a built-in
signal animates it through ≥2 shaping mappings, it has ≥3 presets, and the
setup round-trips through copy-link/export-JSON.

---

## The seven product demos

| Plan | Demo | Lead structure controls | Signature signal-shaping |
|---|---|---|---|
| `fui-kit.md` | **FUI Kit** | widget pick, node/lane/band count, connectivity, layout, seed | which elements fire, edge propagation, per-element stagger |
| `glitch-distortion.md` | **Glitch / Distortion** | source image, displacement scale, block size, sort axis | sync drift, chroma phase, dropout gate, pixel-sort threshold |
| `transitions.md` | **Transitions** | bar/radial geometry, letter layout, easing | monotonic progress pace, per-letter rise, sweep playhead |
| `kinetic-type.md` | **Kinetic Type** | word, font, layout, glyph spacing | per-letter wave/stagger, shake-on-peak, glitch threshold |
| `meters.md` | **Meters** | meter type, segment/needle count, range | fill response curve, peak-hold, redline gate |
| `particles.md` | **Particles** | emitter shape, count, gravity, lifetime | birth-rate spikes, burst threshold, spread/velocity |
| `path-scope.md` | **Path & Scope** | path type (wave/vector/spiro/rose), turns, radius | curve shape from raw buffers, head/dot tracking |

## Convergence demos
| Demo | Purpose |
|---|---|
| `etheros-convergence.md` / `field-bridge` | Signal Rack routes `n` onto a live Etheros field recipe parameter. |
| `field-distort` | Etheros field output acts as a displacement source while Signal Rack pulses the warp. |

Each plan lists: purpose & positioning, the full Structure/Signal/Shaping
control list, the MVP increment (first loop deliverable), the increment roadmap,
and which existing `drawApplied()` cases to port.

---

## Conventions (so seven demos feel like one suite)

- **Visual language:** carry the current tool's palette (`#36f09a` accent on dark
  `#0e1a1f`), mono UI font, glow discipline.
- **Parity first:** renderers read `n`/`bufX`/`bufY` only — never reimplement
  signal math. CI's `validate.js` stays the oracle for the engine.
- **Standalone + pick-whip:** every demo ships a built-in source *and* accepts an
  external recipe (the suite-upsell logic from the breakup §4.4).
- **Lab is the dev surface:** demos live under `demos/` and are previewable the
  same way as `tool/` (`python3 -m http.server`); promote to a plugin later.
- **No build step:** dependency-free ES modules + canvas/WebGPU, matching `tool/`.
