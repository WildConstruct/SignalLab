# Implementation Options & Chosen Path

Answers first-pass questions **1** (viable path), **12** (not feasible without
native plugin), **13** (not feasible without a panel), **14** (deferred).

> **Architecture correction (this revision).** Per Wild Construct standards,
> the engine is **developed in WebGPU/WGSL first and exposed natively through
> the C++ Dawn bridge** — the same pattern as `ethera-etheros`
> (`Recipe → CompiledConfig → runtime`, `Recipe → .wcx payload`, WebGPU/Dawn as
> the *only* backend, modular WGSL as the canonical product source). The
> earlier AE-expression-only engine has been **retired** as the engine and
> survives only as an optional binding/bake helper around the plugin.

Legend: **[C]** confirmed here (built/ran) · **[I]** inferred from docs/conventions, needs in-target verification · **[X]** rejected for v1.

---

## 1. Chosen path: **WGSL engine → Dawn bridge → thin AE plugin**

```
shaders/signal_core.wgsl        canonical engine (sources, processors, output profiles)
        │  (IAN_EMBED_WGSL embeds it as a C string)
        ▼
core/  SignalRecipe ──Compile()──► CompiledSignalConfig   (CPU, unit-tested)
        ▼
runtime/dawn/ SignalRuntime.Evaluate()  ── dispatch ──►  interpreted scalar outputs
        ▼
plugins/after-effects/ signalrack_bridge.h   (AE params ⇄ recipe, CPU-tested)
        ▼
plugin/SignalRackPlugin  (Adobe SDK; WebGpuBackend holds the wgpu::Device)
```

**Why this is the right altitude**

- It matches the **company runtime** so Signal Rack reuses the same Dawn
  device, build system, `.wcx` preset envelope, and shader discipline as
  Ethera/Cathode rather than inventing a parallel stack. **[C — verified the
  conventions against `ethera-etheros`]**
- The **engine is portable**: the identical `signal_core.wgsl` runs in the
  browser (`prototypes/webgpu-lab`) for development and inside AE via Dawn for
  production. **[C — browser harness dispatches the real WGSL; CPU reference
  port passes the current parity suite]**
- Outputs are **interpreted scalars** emitted by the shader (the Etheros
  "outputs philosophy"), so the AE plugin exposes them as ordinary
  pick-whippable output params — the controller-null workflow, productized. **[I — plugin param wiring written to spec, not yet built in AE]**

**What was confirmed by building here**
- `shaders/signal_core.wgsl` — full engine (7 sources, 8 output modes,
  smoothing, gate, trigger). **[C]**
- `core/` Compile() produces the exact 36-float `SignalParams` layout (gen +
  output profiles + processor + sidechain); parity asserted in
  `examples/core_contract_test.cpp` (compiles + passes). **[C]**
- WGSL embed (`tools/embed_wgsl.cmake`) generates the C header. **[C]**
- CPU reference (`prototypes/webgpu-lab/signal-core-reference.js`) mirrors the
  WGSL and passes `validate.js` (vary-over-time, determinism, profiles, gate,
  trigger, chaining, smoothing, luma). **[C]**

**What is written-to-spec but not yet executed in-target**
- `runtime/dawn/*.cpp`, `examples/signal_smoke.cpp` — need a Dawn tree to
  compile/link (same status as Etheros examples without `third_party/dawn`). **[I]**
- The AE plugin (`plugin/SignalRackPlugin`) — stubbed; needs the Adobe SDK +
  `WebGpuBackend` wiring modeled on Etheros TempBridge. **[I]**

---

## 2. Options rejected or deferred

### 2a. AE-expression-only engine — **[X] retired as the engine**
Was the first draft (a self-contained signal expression on an Output slider).
Rejected per direction because it forks the engine away from the company
WebGPU/Dawn runtime, can't share `.wcx`/shaders, and can't do real pixel work
or stateful DSP. **Kept only** as `tooling/ae/SignalRack-binding-helper.jsx`: a
convenience that pick-whips/bakes around the *plugin's* params. It is explicitly
**not** the engine.

### 2b. Native plugin without the WGSL engine (CPU C++ DSP) — **[X]**
Violates "WebGPU/Dawn is the only supported backend." The Etheros tree removed
its CPU-tint route for the same reason; we don't reintroduce that pattern.

### 2c. CEP / UXP panel as the core — **[X] for v1]**
A panel buys UI, not capability (it still drives AE through the same host).
Deferred until one rack drives one property end-to-end. **[C — guardrail]**

### 2d. Full node editor / patch-cable canvas — **[X] explicit non-goal**
Chaining is pick-whip into an Input param, not cables.

---

## 3. Not feasible **without the native plugin** (Q12)

The browser WebGPU surface proves the *engine*; it cannot do the *AE
integration*. These require the plugin + Dawn bridge:
- Reading AE pixels for the **luma probe** at render time (the plugin feeds
  per-sample luma into the shader's `lumaIn` buffer). **[C — contract defined]**
- Exposing **pick-whippable output params** inside AE. **[I]**
- Sharing AE's **Dawn device** so the engine renders in the AE pipeline. **[I]**
- True **stateful DSP** (one-pole lag, hysteresis, S&H) — even on GPU this needs
  a persistent state buffer the plugin owns across frames; the v1 shader uses
  finite-window approximations + bake. **[C — documented in known-limitations]**

## 4. Not feasible **without a panel** (Q13)

Only ergonomics, not capability: assisted target binding with overwrite
protection, recipe/`.wcx` browse-apply-save, the chaining picker, and bake
controls. All are doable by hand (pick-whip + the binding helper script). The
panel is sugar; ship it after the rack proves out. **[C]**

## 5. Deferred (Q14)

CEP/UXP shell · real audio analysis (lean on AE *Convert Audio to Keyframes* +
Visualizer) · motion-vector probe · stateful-DSP state buffers · Wild Construct
payload transport beyond `.wcx` metadata · color/point output profiles beyond
the scalar core · MIDI/OSC/hardware/cloud (hard non-goals).
