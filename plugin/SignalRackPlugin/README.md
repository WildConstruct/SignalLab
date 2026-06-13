# SignalRackPlugin (stub)

The After Effects plugin that exposes the Signal Rack engine as an effect.
**Not yet implemented** — this directory marks the intended home and conventions.

Model it on the Etheros **TempBridge** plugin:
- `src/backend/WebGpuBackend.{h,cpp}` — owns the `wgpu::Device`, warms it up
  async, and is gated behind a `TEMPBRIDGE_HAS_DAWN`-style define
  (`SIGNALRACK_HAS_DAWN`). WebGPU/Dawn is the only backend; fail loudly if absent.
- Effect entry (`SignalRackPlugin.cpp`) — declares params in the order of
  `plugins/after-effects/signalrack_bridge.h::ParamID`:
  - Source Type (popup), Rate, Amount, Phase, Seed, Offset, Smooth
  - Input A/B/C (sliders, pick-whipped INTO for sidechain)
  - Probe Point, Probe Radius
  - Output A/B/C Mode (popup) + Min + Max
  - **Output A/B/C** (sliders the plugin WRITES each frame, pick-whipped FROM)
- Per render: read params → `ae::MapParamsToRecipe` → resolve Input A scalar →
  (LumaProbe) sample source pixels into a luma buffer →
  `RenderSignalWithDawn(req, device, &out, &msg)` → write `out.current().a/b/c`
  back to the Output params.

## Build (once implemented)
Requires the Adobe After Effects SDK headers and a Dawn tree:
```
cmake -B build -DIAN_DAWN_SOURCE_DIR=/path/to/dawn -DAE_SDK=/path/to/AE_SDK
cmake --build build
```

## Why a plugin and not expressions
Only the plugin can: own AE's Dawn device, sample layer pixels for the luma
probe, expose plugin-written output params, and share the company `.wcx`/WGSL
stack. See `docs/ae-implementation-options.md`.
