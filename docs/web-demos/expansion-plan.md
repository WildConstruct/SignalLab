# Signal Rack — Module Expansion Plan (non-FUI categories)

> Companion to `fui-kit.md`. Goal: take the same approach that worked for FUI —
> a small **per-category primitive kit** + compose many widgets/variants — and
> apply it to the other six demo modules. Everything stays **signal-driven**
> (our edge vs. static AE template packs), **designer-sized** (fixed element
> size; count/extent grows the artwork), and **2.5D-capable** where it earns it.
>
> Grounded in: the tool's existing 59 `drawApplied()` cases (our richest source)
> + targeted domain research. Status 2026-06-18.

## Cross-cutting architecture (do once, reuse everywhere)

1. **Keep building on the shared layer we already have:** `shaping.js`
   (field map · response · peak-hold) and the host Signal tier (X/Y/combine/
   smoothing/speed). New widgets inherit "mess with it till happy" for free.
2. **One primitive kit per category** (mirroring `fui.js`):
   | Kit file | Provides | Used by |
   |---|---|---|
   | `fui.js` ✅ | cell, hexCell, tickRing, arc, bracket, needle, readout, lit | FUI **+ Meters** (ticks/needle/arc/readout) |
   | `scope.js` | plot, polar, parametric, lissajous, headDot, projector | Path & Scope |
   | `particles.js` | emitter core (spawn/integrate/draw), gravity, flow-field | Particles |
   | `type.js` | glyph layout, per-letter field sampling, transform stack | Kinetic Type |
   | `glitch.js` | rgbSplit, blockDisplace, scanlines, pixelSort, noise, barrel | Glitch |
   | `transitions.js` | playhead, easing library, reveal masks | Transitions |
3. **A shared `proj3.js`** (project x,y,z → 2D w/ rotation) so 2.5D is
   consistent across modules — powers the 3D die/hex (retrofit), 3D Lissajous/
   attractor, extruded type, wireframe globe. This is the through-line for the
   "3D versions of tools" direction.

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
