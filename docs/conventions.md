# Wild Construct Conventions Signal Rack Follows

Signal Rack adopts the structure observed in the **`ethera-etheros`** runtime
(reference repo, default branch `codex/ethera-runtime-bridge`) so it slots into
the company stack instead of forking it. This document records what we matched
and why, so reviewers can check us against the source of truth.

> Notion was unavailable this session; these conventions were extracted by
> reading `ethera-etheros` directly. Treat anything marked **[verify]** as
> "confirm against Notion/Etheros before relying on it."

## Architectural paths (from `docs/company-standards-integration.md`)

Etheros documents three canonical paths. Signal Rack mirrors them 1:1:

| Etheros | Signal Rack |
|---|---|
| `FieldRecipe → CompiledFieldConfig → runtime` | `SignalRecipe → CompiledSignalConfig → runtime` |
| `FieldRecipe → .wcx payload` | `SignalRecipe → .wcx payload` |
| `FieldRecipe or host state → Moniker → suggested name` | `SignalRecipe → Moniker → suggested name` |

- `SignalRecipe` → `include/signalrack/signal_recipe.h`
- `CompiledSignalConfig` + `Compile()` → `core/signal_runtime_config.h`
- `.wcx` envelope → `schemas/examples/wcx-envelope.example.json`
- `Moniker` → `core/signal_moniker.h`

## Directory layout (matched to Etheros)

| Etheros | Signal Rack | Role |
|---|---|---|
| `shaders/*.wgsl` | `shaders/signal_core.wgsl` | **canonical** engine source |
| `include/etheros/` | `include/signalrack/` | public contract headers (no Dawn internals) |
| `core/` | `core/` | recipe → compiled config, naming (CPU-testable) |
| `runtime/dawn/` | `runtime/dawn/` | Dawn/WebGPU runtime + bridge impl |
| `plugins/after-effects/` | `plugins/after-effects/` | AE-facing request↔recipe mapping |
| `plugin/TempBridgePlugin/` | `plugin/SignalRackPlugin/` | the Adobe-SDK plugin (`WebGpuBackend`) |
| `examples/` | `examples/` | smoke consumers (CPU + Dawn) |
| `tools/` | `tools/` | build/codegen scripts |
| `docs/` | `docs/` | docs + audits |

## Hard rules adopted

1. **WebGPU/Dawn is the only supported backend.** No CPU fallback; unsupported
   device init **fails loudly** (Etheros removed its `CpuTintBackend`; we never
   add one). See `RenderSignalWithDawn` returning `false` + message.
2. **Modular WGSL is the canonical product source.** C++ is plumbing; the
   signal *behaviour* lives in `signal_core.wgsl`. Embedded via `IAN_EMBED_WGSL`.
3. **Public headers stay decoupled from runtime internals** (Etheros
   `circular-deps-audit`): `include/signalrack/*` never includes `runtime/*`.
4. **Outputs philosophy:** the shader emits *interpreted scalar outputs*; hosts
   read scalars and never re-derive the signal (`outputs-backlog.md`).
5. **Fail loud on missing deps** (Dawn, MSVC, Adobe SDK) rather than silently
   degrading (`ethera-tooling-map.md`).

## Naming / namespacing

- C++ namespace: **`ItsAllNoise::SignalRack`** (Etheros uses
  `ItsAllNoise::Etheros`; "IAN" = *It's All Noise*).
- CMake options prefixed **`IAN_`** (`IAN_EMBED_WGSL`, `IAN_USE_EXTERNAL_DAWN`,
  `IAN_DAWN_SOURCE_DIR`, `IAN_BUILD_SIGNALRACK_AE_SURFACE`).
- WGSL params: a flat `struct` of `f32` fields (cf. Etheros `NoiseParams`).
- AE layer auto-naming via Moniker → `"SR · <Name>"`.

## Build dependency (same as Etheros)

The runtime needs a Dawn tree. Set `IAN_DAWN_SOURCE_DIR` to a vendored/checked
`third_party/dawn`, or `-DIAN_USE_EXTERNAL_DAWN=ON` with an installed Dawn. The
headers `dawn/webgpu_cpp.h`, `dawn/dawn_proc.h`, `dawn/native/DawnNative.h` are
the same ones Etheros consumes. **[verify exact Dawn revision pinned by the org.]**

## Open convention questions (for Brian/Harry)

- Is there a shared **`.wcx` schema repo** Signal Rack should depend on rather
  than re-declaring the envelope here? **[verify]**
- Should the engine live in **its own repo** (as now) or as a module inside a
  shared `itsallnoise` monorepo alongside Etheros/Cathode? **[verify]**
- Confirm the canonical **Dawn version** and whether shaders should target a
  specific WGSL feature level. **[verify]**
