# Bake Tests

Bake = the escape hatch. A live rack-driven property is sampled over the work
area and written to keyframes, optionally detaching from the rack so the result
survives on a machine without the plugin.

## Tool
`tooling/ae/SignalRack-binding-helper.jsx` → **Bake (keep)** / **Bake + Detach**.
Implementation: `valueAtTime` per frame over `[workAreaStart, +workAreaDuration]`
→ `setValuesAtTimes`; Detach also clears the expression.

## Modes to verify in AE [manual, needs AE]
| Mode | Pass when |
|---|---|
| Bake output param | the rack's Output A param gets one keyframe/frame matching live |
| Bake target directly | the driven property (e.g. Scale) gets baked keyframes |
| Detach | after bake, the property has no expression and still matches |
| Dense | every frame keyed; visually identical to live |
| Simplify (future) | tolerance reduces keyframes while preserving peaks |

## Live-vs-baked comparison method
1. Note Output A / target value at frames 0, 5, 10, 15, 20 (live).
2. Bake.
3. Compare baked values at the same frames; expect exact match at frame centers
   (both sample the same `valueAtTime`).
4. Between frames, baked is linearly interpolated — fast signals (high rate,
   triggers) need dense bake or higher comp fps to avoid aliasing.

## Acceptance
Baked closely matches live; the target can be detached; limitations (interp
aliasing on fast signals, keyframe count) are documented.
