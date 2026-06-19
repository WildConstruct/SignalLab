# Signal Rack

> Safe, visible, pick-whippable control outputs for After Effects — without a
> modular programming environment.

## ▶ First deliverable: the Signal Generator web tool

A browser playground to **experiment with signals** — two generators driving an
oscilloscope **waveform** and an X-Y **vectorscope** (Lissajous). Runs the real
`signal_core.wgsl` on WebGPU, with a bit-identical CPU-reference fallback so it
always shows. Tweak sources/rate/phase/offset live; presets; export any
experiment as a recipe JSON.

```bash
python3 -m http.server 8000   # from the repo root
# open http://localhost:8000/tool/
```
See `tool/README.md`.

---

Signal Rack is a chainable signal-output module for After Effects. Create or
sample a time-varying signal, shape it, and expose three pick-whippable outputs
that drive ordinary AE properties or Wild Construct plugin params. Chain racks by
pick-whipping one rack's output into another's input — **modular by composition,
not modular by interface.**

## Architecture (WebGPU-first → Dawn bridge)

Following Wild Construct conventions (see `docs/conventions.md`, modeled on
`ethera-etheros`): the engine is **WGSL**, developed in WebGPU first, exposed
natively through the **C++ Dawn bridge**, consumed by a thin AE plugin.

```
shaders/signal_core.wgsl   ← canonical engine (sources, processors, output profiles)
include/signalrack/        ← public contract (Recipe, Output, Dawn bridge)
core/                      ← Recipe → CompiledSignalConfig, Moniker (CPU-testable)
runtime/dawn/              ← SignalRuntime + RenderSignalWithDawn (Dawn dispatch)
plugins/after-effects/     ← AE params ⇄ Recipe mapping
plugin/SignalRackPlugin/   ← the Adobe-SDK plugin (stub)
prototypes/webgpu-lab/     ← develop-first surface: runs the WGSL in the browser
schemas/                   ← recipe + output-profile JSON; .wcx preset envelope
docs/ · tests/ · examples/ · tooling/ae/
```

Canonical paths (matched to Etheros): `Recipe → CompiledConfig → runtime`,
`Recipe → .wcx payload`, `Recipe → Moniker → name`. WebGPU/Dawn is the only
native backend — no CPU fallback in the AE/native runtime. Browser tools keep a
CPU reference mirror only as a parity oracle and preview fallback.

## Run what's runnable now

```bash
# 1. Engine logic parity oracle (no GPU)
cd prototypes/webgpu-lab && node validate.js          # 30/30 pass (engine owns source/smooth/process/sidechain/lag/luma/window/z)

# 2. C++ contract (Recipe→Compile→params parity, AE param mapping)
g++ -std=c++17 -I include -I . examples/core_contract_test.cpp -o /tmp/t && /tmp/t

# 3. The real WGSL engine in a browser (WebGPU)
cd prototypes/webgpu-lab && python3 -m http.server   # open index.html over http://

# 4. WGSL embed step (codegen the C header)
cmake -DWGSL_IN=shaders/signal_core.wgsl -DWGSL_OUT=/tmp/h.h -DWGSL_SYMBOL=kSignalCoreWgsl -P tools/embed_wgsl.cmake
```

The native runtime (`runtime/dawn/*`, `examples/signal_smoke.cpp`) and the AE
plugin need a Dawn tree + the AE SDK to build — see `docs/conventions.md`.

The current browser demo surface is broader than the native plugin scaffold:
`demos/` now contains seven product demos plus two Etheros convergence demos.
Treat those as executable WebGPU/CPU-reference proof, not as completed AE plugin
verification.

## Start here
- `IMPLEMENTATION-REPORT.md` — what was built, decisions, findings, open questions.
- `docs/ae-implementation-options.md` — why this path, what was rejected.
- `docs/feasibility-notes.md` — answers to the first-pass feasibility questions.
