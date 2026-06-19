# Etheros ↔ Signal Rack — engine convergence

> 2026-06-19 · Code-level read of the `ethera-etheros` snapshot (core/, include/,
> examples/, docs/) against Signal Rack. Finding: they're the **same architecture
> in two domains** — Etheros generates a field over *space*; Signal Rack a signal
> over *time* — and at the **Output stage they literally meet**. Proposes shared
> primitives + a unified recipe/manifest contract + a field⟷signal bridge.

## What Etheros actually is (from the snapshot)
- WebGPU/Dawn **field engine**. Public API (`include/etheros/field_library.h`):
  `LoadFieldRecipeFromJson → CompileFieldRecipe(recipe) → CompiledFieldConfig`,
  driven per-frame by `MakeFieldModuleRequest(recipe, w, h, timeSeconds, frameIndex)`.
- Typed recipe (`core/etheros_recipe.h`): **Variation · Structure · Shape · Motion
  · Warp · Output (+ Volume)**.
- Modular contract (`field_module_contract.h`): `FieldModuleKind {PrimaryScalarField,
  VolumeFieldExtension}`, `OutputSemanticClass {Scalar, Directional, Temporal}`,
  capability negotiation (`requiresTemporalHistory`, payload shape).
- Portable recipes: JSON round-trip + `schemas/etheros-field-recipe.schema.json` +
  golden-hash render parity (`examples/golden_hashes.expected.txt`).
- Example recipes (`examples/recipes/*.json`): phasor-flow, crystal-rock,
  clustered-grain, bubble-nebula — each a full block composition.

## The mapping (code-confirmed)

| Etheros | Signal Rack | Note |
|---|---|---|
| `Variation{seed,variation,coherence,phaseOffset}` | seed / timebase | |
| `Structure{primitive,fractalMode,baseScale,bands…}` | **Structure** tier (generator) | |
| `Motion{static/evolve/flow/flowAnisotropic}` | **Signal** tier (temporal driver) | |
| `Shape{bias,contrast,gain,thresholdLow/High,clamp,invert,absolute}` | `shaping.response` + threshold | **near-identical struct** |
| `Warp + FlowFieldMode::InternalCurl` | `field.js` (curl/flow) | we built the toy of this |
| `Output{Delta,Speed,Acceleration,Pulse,CrossUp/Down,ThresholdGate,Energy,Gradient,Flow}` | our derived signals | **the seam — see below** |
| `CompileFieldRecipe` + JSON + schema + golden hashes | Manifest v0 + `toExpression` + CPU parity | Etheros is ahead here |
| `FieldModuleKind` + module contract | plugin-let / reduced-component module | |

## The seam: Output is signal-domain
`OutputType` (Temporal class, `requiresTemporalHistory`) =
`Delta, Speed, Acceleration, Pulse, CrossUp, CrossDown, ThresholdGate, Energy,
Gradient, Flow`. **That is Signal Rack's derived-signal vocabulary, computed on a
field's time-series.** Etheros makes a field; its temporal outputs derive *signals*
from it. **Signal Rack is the 1-D case of Etheros's temporal output stage.**

## Proposals

### 1. Shared engine primitives (extract once, both consume)
- **Shape/Shaping module** — `bias·contrast·gain·thresholdLow/High·clamp·invert·
  absolute`. Etheros `Shape` ≈ our `shaping.response`+threshold. One module,
  `toExpression`-able, used by both.
- **Temporal-operators module** — `delta·speed·acceleration·crossUp/Down·
  thresholdGate·pulse·energy`. Signal Rack computes these on 1-D `n`; Etheros on a
  field over time. Same math, one module.

### 2. Unified recipe/manifest contract
Adopt the Etheros recipe block shape as the WC Component contract. A Signal Rack
manifest becomes a *sibling recipe* (time-domain) sharing `metadata/variation/shape/
output` verbatim and specializing `structure/motion`. (See `manifest-v0.md` →
"Alignment to the Etheros recipe contract".) Etheros's `CompileFieldRecipe` is the
prior art for the WC effect-compiler.

### 3. Field ⟷ Signal bridge (real composition)
Etheros already takes `timeSeconds` per request, so:
- **Signal → field:** a Signal Rack signal drives an Etheros recipe param
  (`n → motion.flowStrength` / `warp.amount` / `shape.thresholdLow`) → a
  *signal-driven field*.
- **Field → signal:** an Etheros field sampled at a probe point *is* a Signal Rack
  source.
Prototype: `demos/field-bridge/` with `etheros-lite.js` (a CPU field mirroring the
recipe blocks) where the host driver routes `n` onto a recipe param. This is the
Capsule/rig composition from the WC Components doc — two engines, one look.

## Honest caveats
Point-in-time snapshot; read core/include/examples/docs, not the WGSL field shader
(`shaders/`) or every runtime path. Describes the *contract*, not pixel-level shader
behavior. The bridge prototype is an **Etheros-lite CPU mirror** for the web demos,
not the real Dawn engine — it proves the composition shape, not parity.
