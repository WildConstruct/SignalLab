# Demo Plan — Glitch / Distortion

**Positioning:** the purest "signal in the background" case (breakup §4.3). The
**image is the foreground**; the signal is invisible and *subtly warps it* —
sync drift, chroma bleed, dropout, displacement, pixel-sort. This is the seed of
the "retro logo machine / big device" north star and the glitch-plugin tangent
from the meeting (01:43:47). Reuses the real `tool/cathode-crt.js` 2-pass NTSC
overlay that was already driven by the signal in Brian's demo.

## Controls
- **Structure:** source (built-in test card / imported image); scanline density;
  mask/curvature; block size (for block displacement); sort axis & span.
- **Signal:** built-in driver or external recipe.
- **Shaping:** sync drift (px); chroma phase (°); dropout gate (threshold);
  horizontal displacement amount; pixel-sort threshold + band selection.

## MVP (first loop slice)
Built-in test card + RGB split + scanline displacement; signal drives horizontal
**sync drift** and **chroma phase**. Port the `crt` / Cathode wiring + the
`strobe`/`ringPulse` Visual cases for energy response. One preset
("Broadcast Sync Drift", mirrors the existing `.wcx` recipe).

## Roadmap
1. MVP sync-drift + chroma on test card. 2. Import an image → drive its
displacement field over time (retro logo machine). 3. Dropout gate + bloom.
4. Pixel sort: signal drives sort threshold + band → "data corruption."
5. Promote the 2-pass CRT shader path (WebGPU) as the renderer; external signal.

## Notes
This demo doubles as the **first "reusable building block" proof**: Signal Rack
→ Cathode params, exactly the cross-plugin reuse thesis. Keep the distortion
params named to match the Cathode plugin so a recipe transfers.
