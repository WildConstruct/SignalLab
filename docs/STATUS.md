# STATUS — restructure complete

**Date:** 2026-06-13

The WebGPU-first + Dawn-bridge restructure is **done**. This file previously
tracked a pre-pivot checkpoint; that work has been carried out.

## Architecture (now in place)
The engine is **WGSL** (`shaders/signal_core.wgsl`), developed in WebGPU first
and exposed natively through the **C++ Dawn bridge**, with a thin AE plugin as
consumer — matching Wild Construct conventions (modeled on `ethera-etheros`;
see `docs/conventions.md`). Canonical paths: `Recipe → CompiledConfig →
runtime`, `Recipe → .wcx payload`, `Recipe → Moniker → name`.

## Conventions source
Notion was unavailable this session (user said skip it), so conventions were
extracted by reading the `ethera-etheros` repo directly and confirmed with the
user (`.wcx` preset format, C++ Dawn bridge). See `docs/conventions.md` for the
open items still flagged **[verify]** against Notion.

## Disposition of the pre-pivot files (resolved)
| File / dir | Outcome |
|---|---|
| `prototypes/browser-lab/` | Moved to `prototypes/webgpu-lab/`; now runs the real WGSL on `navigator.gpu`; CPU reference kept as the parity oracle. |
| `schemas/`, `schemas/examples/` | Kept; added `.wcx` envelope example. |
| `docs/ae-implementation-options.md` | Revised — WebGPU-first/Dawn-bridge is the chosen path. |
| `prototypes/ae-expressions/signal-engine.jsx` | **Retired** (deleted). |
| `prototypes/ae-script/SignalRack.jsx` | **Shrunk** to `tooling/ae/SignalRack-binding-helper.jsx` (bind/chain/bake over the plugin; no engine). |

## Verified runnable here
- `node prototypes/webgpu-lab/validate.js` → 54/54 (engine-owned processor,
  sidechain, lag, audio lane + Tympo helper, spring overshoot vs analytic, and a
  78-config bit-exact golden proving spring-off output is unchanged).
- `node prototypes/webgpu-lab/codec-validate.js` → 8/8.
- `examples/core_contract_test.cpp` compiles + passes (Compile() WGSL parity,
  incl. spring packing in v10.y/z/w and the AudioLane source).
- `node prototypes/webgpu-lab/gpu-parity-run.js` (optional; Playwright +
  Chromium, WebGPU on SwiftShader) → 9/9 CPU-vs-GPU configs within 2e-3, plus 2
  pre-existing divergences reported (value noise, smooth tap rounding).
- WGSL embed codegen (`tools/embed_wgsl.cmake`) works.

## Update 2026-09-28 — audio lane + spring
- **Audio lane (source 10)** reads the per-sample external input (binding 2,
  `extIn`, shared with the luma probe); `tympo-lane.js` renders Tympo `level` /
  `hits` lanes onto a rack's grid. Replaces the `audioPlaceholder` stand-in
  (`schemas/examples/05b-audio-lane.json`).
- **Spring** (`spring`, `springHz`, `springDamping` in v10.y/z/w) replaces lag
  with a damped 2nd-order FIR that genuinely overshoots and settles; Needle
  Bounce (tool preset + `03-needle-bounce.json`) now uses it. Limits in
  `docs/known-limitations.md`.

See `IMPLEMENTATION-REPORT.md` for the full report and open questions.
