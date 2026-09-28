# Known Limitations & Fragility

Honest accounting. **[C]** observed here · **[I]** inferred, verify in-target.

## Engine (WGSL) limitations

- **No per-frame state; stateful DSP is windowed. [C]** The shader has no
  per-frame memory, so one-pole lag, springs, hysteresis, sample-and-hold, and
  slew are **approximated** with finite-window math over past frames:
  smoothing is a bounded box-average of the *source* (≤24 sub-samples), lag is
  a geometric-weighted window (≤34 frames), and the trigger is a 3-frame
  rising-edge look-back. Hysteresis / S&H / slew still need a persistent GPU
  state buffer the host owns across frames (deferred) or a bake.
- **The spring is a bounded FIR, exact up to its window. [C]** `spring` (with
  `springHz`, `springDamping` = ζ) replaces lag with the discretised impulse
  response of a damped 2nd-order low-pass, g(τ) ∝ e^(−ζωτ)·sin(ω_d·τ),
  normalised to unit DC gain, over taps covering the envelope down to ~3%
  (≤64 taps). It really overshoots and settles: a step overshoots by
  ≈ e^(−ζπ/√(1−ζ²)) (0.372 at ζ = 0.3, measured 0.373 at 60 fps) and ζ ≈ 1 does
  not overshoot (`validate.js`). What it is *not*: a stateful integrator.
  Truncating at 3% and renormalising scales the transient by up to ~±4%
  (overshoot within ~0.04 of analytic across ζ, worst near ζ 0.5–0.7), and
  input older than the window is forgotten. Accuracy also needs ≳10 taps per
  ringing period (e.g. at 30 fps keep `springHz` ≲ 3).
  - **Strided taps.** When the envelope is longer than 64 frames (slow springs,
    or a grid finer than a frame such as the web tool's ~3 ms preview) the taps
    are spaced S frames apart so `springHz` stays in real-time Hz. Taps sit on
    an absolute time grid and the output is interpolated between grid points,
    so it stays smooth. Per-sample inputs with content faster than the tap
    spacing (sharp hits) can alias: give hits a decay ≳ the tap spacing, or
    box-filter the input over S samples (`SignalCore.springStride()`; the tool
    does this for audio lanes).
  - **Headroom.** With the spring on, `n` is clamped to [−1, 2] instead of
    [0, 1] and continuous output profiles extrapolate past `[min, max]`, so the
    bounce reaches the property. Size ranges as the *settled* scale (or leave
    gain headroom, e.g. the tool's Needle Bounce uses gain 0.55). Gate/Trigger
    are unaffected; with the spring off every clamp is unchanged (bit-exact
    regression in `validate.js`).
  - **History.** Lag and spring look back over past frames. Generator sources
    are re-evaluated at earlier times, but per-sample inputs (luma, audio lane)
    only have the samples in the dispatch: a host must evaluate a window that
    includes the history (≥ S·K frames) and read the last sample. A
    single-sample dispatch, or a **Linked** source (one Input A scalar), gives
    the spring nothing to bounce on.
- **Gate hysteresis / trigger cooldown are nominal in v1. [C]** The schema
  carries `hysteresis`/`cooldownFrames`, but the expression-free GPU path
  honours only a plain threshold and a fixed pulse width. Document this so the
  recipe doesn't over-promise.
- **Noise ≠ AE noise. [C]** The WGSL uses deterministic value-noise; the JS
  reference implements the same formula, but neither matches AE's internal
  `noise()`. That's fine (the engine is the shader now), but old
  expression-based recipes won't be bit-identical.
- **CPU reference ≠ GPU for value noise and some smoothing. [C]** Measured with
  `prototypes/webgpu-lab/gpu-parity.html` (SwiftShader): every other path
  matches within ~1e-4, but noise / random-walk diverge completely (the hash
  `fract(sin(n)·43758.5)` in f32 amplifies `sin()` error), and smoothing picks
  a different tap count when `smooth·24` has a fraction ≥ 0.5 (CPU rounds, WGSL
  truncates — e.g. `smooth` 0.07). Both predate the spring/audio-lane work.
- **Trigger does not see per-sample history. [C]** The trigger look-back
  re-reads the current sample of per-sample inputs, so over luma / audio lanes
  it never fires. Use Gate (or the lane's `hits` feed) instead.
- **Random walk is fBm, not an integrated walk. [C]** Deterministic and
  walk-*like*, but it does not accumulate; true Brownian motion would need state.

## Determinism

- Same `seed` ⇒ same signal, verified. **[C]** Keep seeds explicit in recipes;
  never leave randomness time-or-machine dependent (guardrail).

## AE integration fragility (inherited)

- **Name-based references break on rename/duplicate/precomp.** Mitigated by
  Moniker auto-naming, a short `id` in the layer name, and a rack marker
  carrying machine identity for a future repair pass. **[I]**
- **Pick-whip overwrites existing expressions.** The binding helper warns/asks
  before overwriting; never clobber user expressions silently (guardrail). **[I]**
- **Cross-comp / precomp references are brittle.** Keep a rack and its targets
  in the same comp for v1. **[I]**

## Audio lane (Tympo)

- **The engine reads, it does not analyse. [C]** `audioLane` (source 10) reads
  the per-sample external input (binding 2, shared with the luma probe). The
  host renders a Tympo lane onto the rack's grid with
  `prototypes/webgpu-lab/tympo-lane.js` (level: linear interpolation, hits:
  strength·e^(−t/decay)). The web tool does this from a loaded export; the AE
  plugin does not yet (the generated AE expression reads a 0..1 slider keyed
  from the lane instead). **[C tool / I plugin]**

## Luma probe

- **Live `sampleImage` is slow and per-property. [I]** Each dependent read may
  re-sample; production must analyze-and-cache (bake). Color management
  (working space vs display), pre/post-effect sampling, and sub-pixel position
  all affect the value — see `tests/luma-probe-tests.md`.
- **The GPU probe needs the plugin** to hand pixels to the shader's external
  input buffer (`extIn`, binding 2); it can't run from the browser lab.
  **[C — contract only]**

## Build / runtime

- **Dawn is a hard dependency. [C]** `runtime/dawn/*` and the smoke example
  won't compile without a Dawn tree (`IAN_DAWN_SOURCE_DIR`). This matches
  Etheros; there is no CPU fallback by design.
- **The AE plugin is stubbed. [I]** `plugin/SignalRackPlugin` needs the Adobe
  After Effects SDK and a `WebGpuBackend` (model on Etheros TempBridge) before
  any of the AE-side claims can be confirmed in-app.

## What stays unverified until we have AE + Dawn

Output params being pick-whippable in-app · guide-layer render exclusion ·
luma probe accuracy/perf · bake parity vs live · reference behaviour under
duplication/rename/precomp. All are written to documented behaviour but flagged
**[I]** until exercised on a real machine.
