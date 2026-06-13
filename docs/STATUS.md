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
- `node prototypes/webgpu-lab/validate.js` → 10/10.
- `examples/core_contract_test.cpp` compiles + passes (Compile() WGSL parity).
- WGSL embed codegen (`tools/embed_wgsl.cmake`) works.

See `IMPLEMENTATION-REPORT.md` for the full report and open questions.
