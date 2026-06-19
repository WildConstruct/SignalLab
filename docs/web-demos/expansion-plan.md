# Signal Rack — Module Expansion Plan (non-FUI categories)

> Companion to `fui-kit.md`. Goal: take the same approach that worked for FUI —
> a small **per-category primitive kit** + compose many widgets/variants — and
> apply it to the other six demo modules. Everything stays **signal-driven**
> (our edge vs. static AE template packs), **designer-sized** (fixed element
> size; count/extent grows the artwork), and **2.5D-capable** where it earns it.
>
> Grounded in: the tool's existing 59 `drawApplied()` cases (our richest source)
> + targeted domain research. Status 2026-06-18.

## Cross-cutting architecture — engine vs. design

**Principle (per Brian): the underlying drivers are ENGINE, not widget code.**
We're building reusable engines; the generator/behaviour math lives in the engine
and is *surfaced* by the tools. So every new capability splits in two — and the
real investment is column A.

### A) Engine drivers (reusable — the real work)
Deterministic, windowable, **parity-disciplined like `signal-engine`** (mirror the
WGSL/plugin core so a look ports), and `toExpression`-able where it makes sense.
Consumed by many tools *and* other products (Signal Rack plugin, Entropy):

| Engine driver | Produces | Consumed by |
|---|---|---|
| signal driver ✅ (`signal-engine.js`) | `n` / `bufX` / `bufY` + `toExpression` | all |
| shaping ✅ (`shaping.js`: field / response / peak-hold) | mapped values | all |
| **attractor** | x/y/z point stream (Lorenz/deJong/Clifford/Aizawa/Thomas) | Path & Scope, Particles |
| **field** (flow / curl-noise) | vector `f(x,y,t)` | Particles, Glitch (warp) |
| **easing / timing** | shaped playhead 0..1 | Transitions, Kinetic Type |
| **proj3** | (x,y,z) → 2D w/ rotation | every 3D variant |
| **parametric / lissajous** | x(t),y(t)[,z(t)] | Path & Scope, Meters (goniometer) |

Discipline for an engine driver: deterministic given (t, params, seed); windowable
(sample a span, like `driver.window`); CPU-reference parity with the core; export
path where meaningful. **Tools only surface params + render.**

### B) Design kits (per-deliverable rendering — independent craft)
How each surfaces visually. Real work, but separable from the engine.

| Design kit | Draw helpers | For |
|---|---|---|
| `fui.js` ✅ | cell/hex/tickRing/arc/bracket/needle/readout | FUI **+ Meters** |
| scope draw | plot / polar / headDot / trail | Path & Scope, Meters |
| particles draw | sprite / trail / glow | Particles |
| type draw | glyph layout / transform stack | Kinetic Type |
| glitch draw | rgbSplit / scanlines / displace | Glitch |

→ Each demo = **surface an engine driver + a design kit.** The per-category sections
below list both halves; build the engine driver first, then the design on top.

---

## 1 · Glitch / Distortion
*Sources: [Glitchology beginner guide](https://glitchology.com/glitch-art-guides/beginners-guide-to-getting-started-with-glitch-art/), [Mondniles datamosh](https://mondniles.com/en/tools/datamosh), [Visionary glitch](https://visionaryvideo.app/effects/glitch/).*

| Canon | Have | Add |
|---|---|---|
| Chromatic aberration / RGB split | ✅ | diagonal/lens variant |
| Datamosh: I-frame drop · block displace · pixel sort | ✅ block, pixel-sort | I-frame "melt" trails |
| VHS: tracking error · colour bleed · head-switch noise | partial (sync drift) | tracking band, colour bleed, head-switch |
| CRT: scanlines · phosphor glow · vignette · barrel | ✅ scanlines | phosphor, vignette, **barrel distortion** |
| Static / noise / dropout | ✅ dropout | film grain, snow, signal-loss |
| Posterize / quantize / bit-crush | ❌ | posterize + palette crush |
| Feedback / echo trails | ❌ | frame-feedback trails |
| **Displacement from an imported image** ("retro logo machine") | ❌ | the headline ask |

- **Kit:** `glitch.js` (factor the inline passes out of the MVP).
- **Special:** real **image import** (the logo machine) — extend the host Import to accept images; signal drives displacement/sort/chroma over the user's media.
- 3D: low priority here.

## 2 · Kinetic Type
*Canon: per-letter transform stacks; wave, cascade/stagger, typewriter, scramble/decode, jitter, RGB split, spring/bounce, tracking pulse, mask reveal, 3D extrude/rotate.*

| Canon | Have | Add (tool case) |
|---|---|---|
| Per-letter wave / scale / glow | ✅ wave | — |
| Pump · shake · RGB glitch | ✅ | — |
| Typewriter reveal | ❌ | `textType` |
| Numeric counter / odometer | ❌ | `textCounter` |
| Per-word opacity cascade | ❌ | `textOpacity` |
| Scramble / decode-in | ❌ | new |
| Spring / bounce-in, tracking pulse | ❌ | new |
| **3D extrude / rotate-Y** | ❌ | via `proj3.js` |

- **Kit:** `type.js` (glyph layout + per-letter field sampling — generalizes the current wave).
- 3D: extruded/rotating text is a strong showcase (depth layers like the die).

## 3 · Meters
*Canon (audio/instrument metering): VU needle, PPM, bar/LED, radial gauge, dial, histogram/spectrum, stereo goniometer, waterfall/spectrogram, peak-hold/RMS.*

| Canon | Have | Add (tool case) |
|---|---|---|
| Bar + gate · radial gauge · LED ladder | ✅ | — |
| Needle dial (VU) | ❌ | `meterDial` |
| Histogram / spectrum | ❌ | `meterHistogram` |
| Stereo correlation / goniometer | ❌ | `meterStereo` |
| Waterfall / spectrogram (scrolling) | ❌ | new |
| Multi-gauge cluster | ❌ | new (designer-sized count) |

- **Kit:** **reuse `fui.js`** (tickRing/arc/needle/readout) + a thin `meters.js` (track/fill/redline). Meters and FUI share a lot — good consolidation.
- Size: cluster count, gauge radius (designer-sizing audit item).

## 4 · Particles  (the bridge to Entropy)
*Canon: burst, fountain/gravity, stream/field, orbit/swarm, fall/rain, shock rings, attractor/flow-field, trails, fireworks, smoke.*

| Canon | Have | Add (tool case) |
|---|---|---|
| Fountain · shock rings · stream | ✅ | — |
| Fall / rain / snow | ❌ | `partFall` |
| Orbit / swarm | ❌ | `partOrbit` |
| Starfield / warp | ❌ | `partStars` |
| Flow-field / attractor | ❌ | new |
| Trails · fireworks · smoke | ❌ | new |

- **Kit:** `particles.js` — emitter core (spawn / integrate / draw), pluggable
  force fields (gravity, orbit, flow-field), shared so every emitter is ~10 lines.
- Size: birth rate, field extent (W×H), gravity, lifetime (sizing audit).
- This kit is the natural seam to hand off to **Entropy**.

## 5 · Transitions
*Canon: wipe (linear/radial/clock/iris), fade/dissolve, slide/push, reveal (mask/text), bars/blinds, countdown, glitch-cut, progress/load.*

| Canon | Have | Add |
|---|---|---|
| Loading bar · wipe · radial · text-reveal · easing | ✅ | — |
| Signal meter load | ❌ | `trMeter` |
| Clock-wipe · iris · blinds · slide/push | ❌ | new |
| Dissolve / pixel-dissolve | ❌ | new |
| Countdown · glitch-cut | ❌ | new |

- **Kit:** `transitions.js` (monotonic playhead + easing library + reveal masks).
- Hook: **signal-shaped easing** (the signal *is* the timing curve) is the
  distinctive angle — let the driver drive the playhead, not just clock time.

## 6 · Path & Scope
*Canon: oscilloscope, XY/vectorscope, Lissajous, polar/rose, spirograph, phase
portrait, waterfall, particle-on-path, parametric curves, strange attractors.*

| Canon | Have | Add |
|---|---|---|
| Wave runner · vectorscope · spirograph · rose | ✅ | — |
| Explicit **Lissajous** (X vs Y freq ratios) | ⚠️ (via vectorscope) | dedicated, with ratio controls |
| **Strange attractor** (Lorenz / de Jong) | ❌ | new — signal perturbs params |
| Phase portrait / polar scope | ❌ | new |
| Waterfall scope (scrolling history) | ❌ | new |
| **3D parametric** (Lissajous-3D, tube) | ❌ | via `proj3.js` — showcase |

- **Kit:** `scope.js` (plot / polar / parametric / projector + headDot).
- 3D: 3D Lissajous / attractor with rotation is the most striking 3D piece.

---

## Suggested sequencing
1. **`proj3.js`** shared projector (unlocks 2.5D everywhere; retrofit die/hex/globe).
2. **Meters** — cheapest wins by reusing `fui.js` (dial, histogram, stereo, cluster).
3. **Path & Scope** — `scope.js` + Lissajous + 3D Lissajous/attractor (high wow).
4. **Particles** — `particles.js` emitter core + fall/orbit/stars/flow-field (Entropy seam).
5. **Kinetic Type** — `type.js` + typewriter/scramble/counter + 3D extrude.
6. **Glitch** — `glitch.js` + VHS/CRT/posterize/feedback, then **image import**.
7. **Transitions** — `transitions.js` + signal-shaped easing + wipe family.

## Open questions / deeper research needed
- **Glitch image import** UX: drag-drop onto canvas vs. host Import; performance of
  per-frame `getImageData` pixel-sort on real media (may need an offscreen buffer).
- **Particles ↔ Entropy** contract: how much of `particles.js` should be the shared
  core both products consume?
- **3D scope** math: which attractors read best as signal-perturbed (Lorenz, de Jong,
  Thomas) — worth a focused research pass.
- Per-category external research (Huds+Guis-style canon checks) can refine each
  table; egress to general web works here, GitHub does not.

---

## Research refinements (2026-06-18)

Deeper per-category passes (general web reachable). Net new specifics + the
**cross-links** that fall out of them.

### Path & Scope — strange attractors are concrete + signal-perturbable
Implementable systems (signal perturbs the constants → it *breathes*):
- **Lorenz (3D, butterfly):** `dx=σ(y−x); dy=x(ρ−z)−y; dz=xy−βz`, classic σ=10, ρ=28, β=8/3.
- **De Jong (2D):** `x'=sin(a·y)−cos(b·x); y'=sin(c·x)−cos(d·y)`.
- **Clifford (2D):** `x'=sin(a·y)+c·cos(a·x); y'=sin(b·x)+d·cos(b·y)`.
- **Aizawa / Thomas (3D)** for `proj3.js` showcases.
Plan: a `scope` "Attractor" widget with a system picker; signal maps onto a/b/c/d
or ρ. Sources: [Algosome – de Jong](https://www.algosome.com/articles/strange-attractors-de-jong.html),
[strange_attractors README](https://github.com/merrypranxter/strange_attractors/blob/main/README.md),
[Hafeez – strange attractors](https://aymenhafeez.github.io/posts/2025-04-15-strange-attractors/).

### Meters — lock to real metering standards
Concrete variants: **VU** (needle, ANSI C16.5), **PPM** (IEC 268-10, broadcast
peak ballistics), **LUFS/RMS** (perceptual, numeric + bar), **true-peak**,
**goniometer** (Lissajous of stereo phase), **correlation** meter, **spectrogram/
waterfall** (scrolling colour history). **Cross-link:** a goniometer *is* a
Lissajous → shares `scope.js` with Path & Scope. Ballistics (attack/decay) become
signal-shaping params. Sources:
[Goniometer (Wikipedia)](https://en.wikipedia.org/wiki/Goniometer_(audio)),
[Digital audio metering guide](https://wearesushimusic.com/2025/12/29/digital-audio-metering-guide/),
[Loudness meters](https://pluginerds.com/11-loudness-vst-metering-plugin/).

### Particles — curl noise + attractor forces are the upgrade
Beyond fountain/rings/stream: **flow fields**, **curl noise** (divergence-free →
fluid feel without sim), and **attractor-driven** motion (pull particles along a
curve / a strange attractor). **Cross-link:** the same attractor math feeds Path &
Scope *and* Particles (attractor-driven matter). `particles.js` should expose a
pluggable force-field (gravity / orbit / curl / attractor). Sources:
[openFuse – strange attractors & curl noise](https://fusefactory.github.io/openfuse/particle%20system/Strange-Attractors-&-Curl-Noise/),
[Houdini – directing particle fluids](https://www.sidefx.com/docs/houdini/fluid/directingparticlefluid.html).

### Kinetic Type — principles to bake into `type.js`
Canon principles: **maintain linearity** (animate in reading order), **sync speed
to pacing** (our signal *is* the pacing curve), **ease in/out**, and the Disney 12
as the backbone; per-letter enter/exit/grow/shrink in 2D/3D. So `type.js` wants a
per-letter **transform stack** + a shared **easing/timing** module (shared with
`transitions.js`). Sources:
[Kinetic typography quickstart (Baker)](https://medium.com/hackernoon/kinetic-typography-quickstart-guide-for-devs-designers-d5c6b5545ade),
[Linearity – kinetic typography](https://www.linearity.io/blog/kinetic-typography/).

### Consolidated cross-links (architecture payoff)
- **`scope.js`** (plot/polar/parametric/attractor) is shared by **Path & Scope**
  *and* **Meters** (goniometer/Lissajous).
- **Attractor math** is shared by **Path & Scope** *and* **Particles**.
- **Easing/timing** is shared by **Kinetic Type** *and* **Transitions**.
- **`proj3.js`** powers every 3D variant (die/hex/globe today; Lorenz/Aizawa,
  extruded type next).
→ Revised build order: **proj3.js → scope.js (attractors + 3D Lissajous) →
Meters (reuse fui.js + goniometer via scope.js) → particles.js (curl/attractor)
→ type.js (+easing) → transitions.js → glitch.js (+image import).**


## Build log
- [x] **Engine:** `lissajous.js` (parametric x/y[/z] from freq ratios + phase) — deterministic, normalized.
- [x] **Surfaced:** Path & Scope **Lissajous** (2D/3D via proj3; signal→phase). Meters **VU dial** + **Goniometer** (reuse `fui.js`; goniometer plots the live L/R channels). Engine drivers now feed multiple tools each.
- [x] **Engine:** `field.js` (vector field: curl/flow, vortex, radial) — deterministic, unit vectors.
- [x] **Surfaced:** Particles gains a **Flow field** emitter (field type/scale/strength); presets Flow Field + Vortex. `field.js` also earmarked for Glitch warp.
- [x] **Engine:** `proj3.js` (projection) + `attractor.js` (Lorenz/Aizawa/Thomas/de Jong/Clifford) — deterministic, normalized, parity-verified.
- [x] **Surfaced:** Path & Scope gains a **Strange attractor** path type (system picker, Signal→shape morph, 3D rotate); presets Lorenz + De Jong. First proof of the engine-vs-design split.
