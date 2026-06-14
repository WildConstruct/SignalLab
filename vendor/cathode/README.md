# vendor/cathode — real Cathode shaders for interop

First interoperability step: drive the Signal Lab stage through **Cathode's
actual WGSL** instead of the modeled `tool/cathode-crt.js` stand-in.

## What to drop here (from `WildConstruct/cathode`)
Copy these files verbatim (keep the filenames):

| From cathode | Purpose |
|---|---|
| `src/shaders/signal/composite_decode.wgsl` | NTSC composite luma/chroma decode (dot crawl, fringing) |
| `src/shaders/display/crt_mask_beam.wgsl`   | aperture-grille mask, scanlines, beam, bloom |
| `src/shaders/output/composite_output.wgsl` | (if the display pass feeds it) bloom gain / display mix |
| any shared WGSL the above `// include` or reference | struct/uniform defs |

If a pass needs a sensor/transport input (`tube_lag`, `ccd_smear`,
`rolling_shutter`, `helical_*`), drop those too — but signal + display is enough
for a first NTSC/CRT screen.

## Why I need the files (not just the names)
Each pass declares its own bindings + uniform struct inline, e.g.
`composite_decode.wgsl`:
```
@group(0) @binding(0) var inputTex   : texture_2d<f32>;
@group(0) @binding(1) var historyTex : texture_2d<f32>;
@group(0) @binding(2) var outputTex  : texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var<uniform> params : SignalUniforms;
@compute @workgroup_size(8,8,1) fn main(...) { ... }
```
To build the correct bind-group layouts + uniform buffers + dispatch I need the
exact struct fields, binding indices, entry-point name, and workgroup size — all
of which live in the file. The C++ `Build*UniformBlock` helpers
(`cathode_signal_pass.h`, `cathode_display_pass.h`) are also handy so I feed
sane default values, but the WGSL is the must-have.

## Provenance
These are copied from the private `WildConstruct/cathode` repo for in-org tool
interop. Keep the Cathode header/license comment intact. The canonical source
stays in `cathode`; this is a vendored snapshot — note the cathode commit SHA
below when you copy.

cathode commit: `__________`
