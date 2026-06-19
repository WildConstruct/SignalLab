# Field Bridge (demo) — Signal Rack × Etheros

Two engines, one look. The Signal Rack driver's `n` **routes onto an Etheros
recipe parameter** (`warp.amount` / `motion.flowStrength` / `shape.thresholdLow` /
`structure.baseScale`) — a signal-driven field. Demonstrates the field⟷signal
composition from `docs/web-demos/etheros-convergence.md`.

## Rendering — the real engine, in the browser

This demo runs the **canonical Etheros field engine via WebGPU**, not a CPU
re-derivation:

- **GPU path (default):** `shared/etheros-gpu.js` loads the vendored
  `shared/etheros/primary_slice.wgsl` — the same WGSL the native/plugin runtime
  uses — compiles it as a WebGPU compute shader, packs the recipe into the
  `NoiseParams` std140 uniform (layout parsed straight from the WGSL), dispatches
  the compute pass to a storage texture, and blits it with a palette. The
  recipe→uniform mapping is ported verbatim from the Etheros web lab's
  `engine-bridge.mjs` (`BuildFieldShaderParams`).
- **CPU fallback:** when WebGPU is unavailable, the host falls back to
  `shared/etheros-lite.js` (a CPU mirror of the recipe pipeline). Both paths
  consume the **same recipe**, so the bridge composition is identical either way.

The status badge reads **"Etheros WebGPU"** on the GPU path or **"CPU fallback"**
otherwise.

> Verified in-browser: the slice shader compiles and executes on WebGPU with no
> validation errors, producing a deterministic, structured field. The slice path
> is the 2-D scalar render (volume disabled); it deliberately trims octaves /
> detail / contrast vs. the volume path, matching the native slice config.
