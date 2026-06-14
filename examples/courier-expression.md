# Live courier expression (render-to-value)

The **live** coupling between the WGSL/Dawn engine and a pick-whippable AE value.
The Signal Rack plugin renders each output's normalized value into a **3×1 value
strip** on the rack layer (column A/B/C), computed in WGSL during `Render()`. A
generated expression on the target reads the pixel with `sampleImage` and remaps
it through the channel's range. The user never authors this — the binding helper
writes it. The engine stays in WGSL; the expression only decodes a pixel.

## Generated expression (target property, e.g. Scale)
```js
// Signal Rack — live courier (Output A). Auto-generated; do not hand-edit.
var rack = thisComp.layer("SR · Pulse Driver");
var col  = 0;                                  // A=0, B=1, C=2
var mn   = rack.effect("Signal Rack")("Output A Min");
var mx   = rack.effect("Signal Rack")("Output A Max");
// sample the 1px column center of the 3x1 value strip (layer space)
var rgb  = rack.sampleImage([col + 0.5, 0.5], [0.5, 0.5], true, time);
// decode 24-bit packed normalized value (8 bits/channel)
var n = (Math.round(rgb[0]*255)*65536 + Math.round(rgb[1]*255)*256 + Math.round(rgb[2]*255)) / 16777215;
linear(n, 0, 1, mn, mx)
```
For Output B/C set `col = 1` / `2` and read the matching Min/Max params.

## Why this is the live path (vs bake)
- **Live:** the value updates as you scrub/play because the plugin re-renders the
  strip every frame; no keyframes.
- **Engine stays WGSL:** the expression does not generate the signal — it reads a
  pixel the engine produced. (This is what "drop the expression engine" allows:
  the courier is a decoder, not a generator.)
- **Codec is shared + tested:** `include/signalrack/value_codec.h` (encode) and
  `prototypes/webgpu-lab/value-codec.js` (reference) are bit-identical;
  `codec-validate.js` + `value_codec_test.cpp` pass (24-bit round-trip ~6e-8).

## Risks to validate in AE (honest)
1. **Color management.** `sampleImage` reads in the layer's working space. A
   gamma/working-space transform corrupts the packed bytes (proven in
   `codec-validate.js`). The value strip MUST be a linear, non-color-managed
   32-bpc pass-through. If that can't be guaranteed, fall back to single-channel
   8-bit (`pack8`, ~1/255) which tolerates gamma better, or use **bake**.
2. **sampleImage on a guide layer.** We need the rack layer excluded from final
   render (guide) yet still sampleImage-readable. Believed OK (guide affects comp
   render, not sampleImage of that layer) — **verify**.
3. **Evaluation order / caching.** Confirm the strip for `time` is current when
   the courier reads it (the plugin renders the rack layer before the target's
   expression evaluates because of the dependency). **verify** under playback.
4. **Precision under 8-bit comps.** 24-bit packing assumes 8-bit channels are
   exact; in an 8-bit project that holds, but verify no dithering is applied.

If any of these fail, the **bake** path (engine → keyframes) is the guaranteed
fallback and needs none of the above.
