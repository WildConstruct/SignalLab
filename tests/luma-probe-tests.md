# Luma Probe Tests

## Status
- **Engine path: runnable now (mocked source).** `validate.js` test 10 feeds a
  synthetic luma function into a `LumaProbe` rack and asserts a normalized
  driven output. This proves the *mapping* (luma → smooth/threshold → output).
- **Real pixel sampling: needs the plugin** to read AE layer pixels and fill the
  shader's `lumaIn` buffer. Not runnable here. [I]

## What to test in AE (manual, once the plugin probes pixels)
| Variable | Cases | Watch for |
|---|---|---|
| Kernel | 1×1, 3×3, 5×5 average | noise vs smoothing; 1×1 is jittery |
| Source type | solid, footage, text, shape | alpha handling, premultiply |
| Precomp source | probe a precomp | coordinate space, collapse transforms |
| Effects on source | pre vs post effect sampling | does the probe see the effect? |
| Position | static vs animated point | sub-pixel interpolation |

## Honest caveats to document from results
- **Performance:** per-frame, per-read pixel sampling is expensive. Treat probes
  as **analyze-and-cache** (bake) for production; live is preview-grade.
- **Color management:** sampled values depend on working space vs display space;
  decide and document whether luma is computed in linear or display gamma.
- **Accuracy:** Rec.601 luma (0.299/0.587/0.114) is used in the shader; note if
  a different weighting is wanted.
- **Caching/staleness:** if the source layer changes, cached probes must
  invalidate; the guide readout should show live/cached/stale state.

## Acceptance
A flashing/pulsing source drives a target property; the value can be shown
numerically and baked; limitations are written down honestly (not hidden).
