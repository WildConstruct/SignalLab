# Known Limitations & Fragility

Honest accounting. **[C]** observed here · **[I]** inferred, verify in-target.

## Engine (WGSL) limitations

- **No true stateful DSP in v1. [C]** The shader has no per-frame memory, so
  one-pole lag, hysteresis, sample-and-hold, and slew are **approximated** with
  finite-window math: smoothing is a bounded box-average of the *source* (≤24
  sub-samples), and the trigger is a 3-frame rising-edge look-back. Real
  stateful behaviour needs a persistent GPU state buffer the host owns across
  frames (deferred) or a bake.
- **Gate hysteresis / trigger cooldown are nominal in v1. [C]** The schema
  carries `hysteresis`/`cooldownFrames`, but the expression-free GPU path
  honours only a plain threshold and a fixed pulse width. Document this so the
  recipe doesn't over-promise.
- **Noise ≠ AE noise. [C]** The WGSL uses deterministic value-noise; the JS
  reference matches it exactly, but neither matches AE's internal `noise()`.
  That's fine (the engine is the shader now), but old expression-based recipes
  won't be bit-identical.
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

## Luma probe

- **Live `sampleImage` is slow and per-property. [I]** Each dependent read may
  re-sample; production must analyze-and-cache (bake). Color management
  (working space vs display), pre/post-effect sampling, and sub-pixel position
  all affect the value — see `tests/luma-probe-tests.md`.
- **The GPU probe needs the plugin** to hand pixels to the shader's `lumaIn`
  buffer; it can't run from the browser lab. **[C — contract only]**

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
