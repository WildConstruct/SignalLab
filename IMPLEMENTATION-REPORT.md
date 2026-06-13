# Signal Rack — Implementation Report

Prepared for Brian & Harry. Status tags: **[C]** confirmed by building/running
in this environment · **[I]** inferred from docs/conventions, needs in-target
verification (AE + Dawn).

> **Mid-task correction applied.** This prototype was re-architected to the Wild
> Construct standard: **develop in WebGPU/WGSL first, expose natively via the
> C++ Dawn bridge**, with a thin AE plugin — matching `ethera-etheros`. The
> initial AE-expression-only engine was **retired** (kept only as an optional
> binding/bake helper). Notion was unavailable; conventions were extracted by
> reading the `ethera-etheros` repo directly (cited in `docs/conventions.md`).

## 1. Summary of what was built
- **Canonical WGSL engine** `shaders/signal_core.wgsl`: 7 sources (sine, pulse,
  ramp, noise, random-walk, linked, luma-probe), finite-window smoothing, and 8
  output modes mapped to **interpreted scalar outputs** (n, A, B, C per sample). **[C]**
- **C++ contract** `include/signalrack/`: `SignalRecipe`, interpreted-output
  types, and the public `RenderSignalWithDawn` Dawn-bridge entrypoint. **[C compiles]**
- **Core** `core/`: `Recipe → CompiledSignalConfig` (`Compile()`, exact 24-float
  WGSL parity) and `Moniker` naming. Unit-tested. **[C]**
- **Dawn runtime** `runtime/dawn/`: `SignalRuntime` (pipeline/buffers) + bridge
  impl that embeds and dispatches the WGSL. **[I — needs Dawn to compile]**
- **AE surface** `plugins/after-effects/signalrack_bridge.h`: params⇄recipe
  mapping, CPU-tested. Plugin itself stubbed in `plugin/SignalRackPlugin/`. **[C map / I plugin]**
- **WebGPU lab** `prototypes/webgpu-lab/`: runs the real WGSL in-browser; CPU
  reference port + `validate.js` (10/10) as the parity oracle. **[C]**
- **Build** `CMakeLists.txt` + `tools/embed_wgsl.cmake` (`IAN_` options, WGSL
  embedding). Embed step verified. **[C]**
- **Schemas** recipe + output-profile JSON, 8 example recipes, `.wcx` envelope. **[C]**
- **Docs/tests** full set under `docs/` and `tests/`.

## 2. Chosen path and why
**WGSL engine → Dawn bridge → thin AE plugin.** It reuses the company runtime
(same Dawn device, build system, `.wcx` envelope, shader discipline as
Ethera/Cathode) instead of forking a parallel AE-only stack, keeps the engine
portable (identical WGSL runs in the browser for dev and in AE for prod), and
exposes outputs as plugin-written, pick-whippable params. Detail:
`docs/ae-implementation-options.md`.

## 3. AE paths rejected and why
- **AE-expression-only engine** — *retired as the engine*: forks away from the
  WebGPU/Dawn runtime, can't share `.wcx`/shaders, no real pixel/stateful work.
  Survives only as `tooling/ae/SignalRack-binding-helper.jsx`.
- **CPU C++ DSP plugin** — violates "WebGPU/Dawn is the only backend."
- **CEP/UXP panel as core** — buys UI, not capability; deferred.
- **Node-graph / patch-cable UI** — explicit non-goal; chaining = pick-whip.

## 4. Prototype files created
Engine: `shaders/signal_core.wgsl`. Contract: `include/signalrack/{signal_recipe,
signal_output,signal_dawn_bridge}.h`. Core: `core/{signal_runtime_config,
signal_moniker}.h`. Runtime: `runtime/dawn/{signal_runtime.h,signal_runtime.cpp,
signal_dawn_bridge.cpp}`. AE: `plugins/after-effects/signalrack_bridge.h`,
`plugin/SignalRackPlugin/README.md`, `tooling/ae/SignalRack-binding-helper.jsx`.
Lab: `prototypes/webgpu-lab/{index.html,signal-core-reference.js,validate.js}`.
Build: `CMakeLists.txt`, `tools/embed_wgsl.cmake`. Examples:
`examples/{signal_smoke.cpp,core_contract_test.cpp,recipe-examples.md,
expression-snippets.md}`. Schemas: `schemas/*` (+ 8 recipes + wcx envelope).
Docs: `docs/*`. Tests: `tests/*`.

## 5. How to run / inspect
See README "Run what's runnable now". Confirmed here: `node validate.js` (10/10),
`core_contract_test.cpp` compiles+passes, WGSL embed codegen works. The browser
lab runs the real WGSL on `navigator.gpu`. Native runtime + plugin need Dawn +
AE SDK.

## 6. Demonstrated workflows
- One signal → one property (Pulse → Scale %). **[C in lab / I in AE]**
- One signal → three properties via A/B/C profiles. **[C in lab]**
- Sidechain Rack A → Rack B (Linked). **[C in lab + validate.js]**
- Guide scope + numeric readout. **[C in lab]**
- Luma probe mapping (mocked source). **[C in lab]**
- Bake/detach. **[I — script to spec]**

## 7. Expression examples
Target-side reads are one-liners (the engine is in the shader, not expressions):
```js
thisComp.layer("SR · Pulse Driver").effect("Signal Rack")("Output A")          // output-side (preferred)
s = thisComp.layer("SR · Pulse Driver").effect("Signal Rack")("Output A");      // target-side remap
linear(s, 0, 1, 80, 120)
```
More in `examples/expression-snippets.md`.

## 8. Sidechain examples
Rack B `SourceType = Linked` reads Input A; the host resolves Input A to a single
scalar (upstream Output at this time) and passes `resolvedInputA`. The shader
forwards it. Verified: `rackB.output("A")/100 == rackA.output("A")`
(`validate.js` test 8). Chains: Audio→Needle→Type, Luma→Gate→Entropy,
Clock→Divider→Gate→Reveal. Detail: `tests/sidechain-tests.md`.

## 9. Guide visualization findings
A shape-layer path expression reading the output param over a time window draws a
waveform; a text layer gives a numeric readout; gate blocks key off the gate
output. Set layers as **Guide Layers** to exclude from final render. The browser
lab renders these scopes live from the same interpreted-output data, proving the
model. **[C model / I in-AE render exclusion]**

## 10. Luma probe findings
Mapping (luma → smooth/threshold → output) works against a mocked source
(`validate.js` test 10). Real pixel sampling needs the plugin to fill the
shader's `lumaIn` buffer; treat probing as **analyze-and-cache** (bake) for
production. Color-management, pre/post-effect, kernel-size, and sub-pixel caveats
in `tests/luma-probe-tests.md`. **[C mapping / I real pixels]**

## 11. Bake findings
`valueAtTime` per work-area frame → `setValuesAtTimes`, optionally clearing the
expression to **detach**. Frame-center values match live exactly; fast signals
(triggers/high rate) need dense bake or higher fps to avoid interp aliasing.
Comparison method in `tests/bake-tests.md`. **[I — to spec, not run in AE]**

## 11b. Critical feasibility finding — output publishing
While scaffolding the plugin I hit the sharpest constraint in the whole concept:
**an AE effect cannot publish a live, pick-whippable computed scalar from
`Render()`** — params are inputs, not effect-written outputs. The viable v1
couplings are **bake** (engine → keyframes on the Output sliders; robust, no user
expressions) and **live render-to-value** (the plugin renders each output into a
3×1 pixel value strip; a generated `sampleImage` expression decodes it and remaps
through the range — live, engine stays in WGSL). The **codec is now prototyped
and proven**: `value-codec.js`/`value_codec.h` are bit-identical (24-bit
round-trip ~6e-8), with a test demonstrating the color-management hazard that
forces the strip to be a linear pass-through. So the live path is no longer
hypothetical — what remains to verify in-AE is `sampleImage` on a guide layer,
evaluation order under playback, and color management. We still **lead with
bake** as the guaranteed fallback. Write-ups: `docs/ae-output-publishing.md`,
`examples/courier-expression.md`. **[C codec proven · I in-AE behaviour.]**

## 12. Known fragility
Name-based AE references break on rename/duplicate/precomp — mitigated by Moniker
naming + short `id` in the layer name + a rack marker for a future repair pass.
No true stateful DSP in v1 (smoothing/trigger are finite-window approximations;
hysteresis/cooldown nominal). Noise ≠ AE noise (engine is the shader now). Full
list: `docs/known-limitations.md`.

## 13. Performance concerns
GPU dispatch is cheap (one `vec4`/sample, three outputs for the price of one).
The real cost is **luma probing** (per-frame pixel reads) → cache/bake. Each AE
expression pick-whip read is cheap because it reads a plugin-written param, not a
recomputed signal. Scope path expressions sampling a window back in time cost
O(window) per frame — keep sample counts modest.

## 14. Recommendations for next prototype
1. Stand up `plugin/SignalRackPlugin` with a `WebGpuBackend` (model on Etheros
   TempBridge) and wire the param order in `signalrack_bridge.h`. **Prove one
   rack drives one AE property end-to-end** — that's the gate.
2. Vendor/pin Dawn; get `examples/signal_smoke.cpp` building and printing scalars.
3. Add the luma-probe pixel path (fill `lumaIn`) and benchmark.
4. Confirm guide-layer render exclusion and the bake/detach round-trip in AE.
5. Only then consider a panel and stateful-DSP state buffers.

## 15. Open questions for Brian and Harry
- Is there a **shared `.wcx` schema** Signal Rack should depend on rather than
  re-declaring the envelope? Where does the canonical schema live?
- Should Signal Rack be its **own repo** (current) or a module in a shared
  `itsallnoise` monorepo with Etheros/Cathode?
- Confirm the **pinned Dawn revision** and target **WGSL feature level**.
- Is `ItsAllNoise::SignalRack` the right namespace, and `SR ·` the right layer
  Moniker prefix?
- For Wild Construct payloads, is `.wcx` metadata sufficient for v1, or is a
  richer transport (channels like `A.norm`/`A.gate`/`A.trigger`) needed sooner
  for Entropy/Cathode?
- Do we want **Angle/Point/Color** output profiles in v1, or hold to scalar
  (Slider) outputs as recommended?
- Should I have skipped Notion, or is there a tool-structure doc I should still
  reconcile against before the plugin work?
