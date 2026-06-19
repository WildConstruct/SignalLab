# Signal Rack Engine Roadmap

**Status date:** 2026-06-19

This packet separates what is already executable from what still needs native
proof. The browser tools and demos are strong product discovery surfaces; the AE
plugin path is still the gate for calling Signal Rack a shippable engine product.

## Current Proof

- `shaders/signal_core.wgsl` is the canonical signal engine.
- `prototypes/webgpu-lab/signal-core-reference.js` is the CPU parity oracle.
- `node prototypes/webgpu-lab/validate.js` currently covers 30 engine-reference
  checks: source, smoothing, process stage, sidechain modulation, lag, luma
  input, feathered window, and third-signal phase bend.
- `prototypes/webgpu-lab/codec-validate.js` proves the 24-bit value-strip codec
  in JS, including the color-management hazard.
- `demos/` proves the authoring/product vocabulary in browser: seven product
  demos plus Field Bridge and Field Distort.

## Missing Native Gates

1. **Dawn build on this repo**
   - Vendor or point at a pinned Dawn tree.
   - Build `signalrack_runtime`.
   - Run `examples/signal_smoke.cpp` against a real `wgpu::Device`.
   - Keep "no CPU fallback" true for native; fail loudly if Dawn is unavailable.

2. **AE one-rack-to-one-property proof**
   - Build `plugin/SignalRackPlugin` with the AE SDK.
   - Apply one rack to a comp.
   - Bake Output A to keyframes and drive one Transform property.
   - Compare sampled values against the browser/CPU reference for a short work
     area.

3. **Live courier proof**
   - Render the 3x1 value strip in the effect.
   - Generate the `sampleImage` decoder expression.
   - Verify scrub/playback evaluation order in AE.
   - Verify the strip survives the required color-management mode. The codec
     tests show why this cannot be assumed.

4. **Luma probe implementation**
   - Sample source-layer pixels in AE.
   - Fill `lumaIn` for the runtime request.
   - Define cache/bake policy for production, because live `sampleImage` or
     per-property probing is not a safe performance promise.

5. **Persistent temporal state**
   - Current lag, random walk, trigger, and gate behavior are bounded,
     parallel-safe approximations.
   - True hysteresis, cooldown, sample-and-hold, slew, delta, speed,
     acceleration, cross-up/down, and energy need host-owned state buffers or a
     bake pass.

6. **Multi-signal routing**
   - Browser demos now prove aux drivers/actions/manifests.
   - Native recipe and AE UI still need a curated A/B/C routing model that avoids
     exposing raw buses by default.

## Contract Work

- Keep `schemas/signal-rack-recipe.schema.json` aligned with Signal Lab exports.
- Promote `docs/web-demos/manifest-v0.md` into a versioned component schema once
  one plugin-let becomes the reference product.
- Adopt Etheros-compatible block names where the semantics match:
  `variation`, `shape`, `warp`, `output`, and target-specific `motion`.
- Treat `_tool` and `_channelY` as authoring metadata, not native plugin API.

## Product Roadmap

### Lane 1: Signal Rack V1

Goal: one rack reliably drives one AE property.

- Bake first.
- Live courier second.
- Guide scope/readout as visual confidence.
- Three outputs remain scalar sliders for v1.

Current implementation order:

1. Host-free native contract proof.
2. Dawn runtime proof.
3. AE bake proof.
4. Live courier proof.

### Lane 2: First Consumer Proof

Goal: show reusable building blocks across Wild Construct tools.

- Recommended proof: Signal Rack drives Cathode sync/chroma/dropout or Field
  Bridge drives Etheros field parameters.
- Keep the demo small: one driver, one visible consumer, one value story.

### Lane 3: Plugin-let Manifest

Goal: convert authoring superset into curated instruments.

- Reference candidate: FUI Kit Neural Net or Processor Die.
- Public controls should be a small Substance-style exposed subset.
- Actions and output passes become first-class once one reference plugin-let
  proves the shape.

### Lane 4: Demo Productization

Goal: make the browser demos buyer-legible.

- Add imported media for Glitch/Field Distort.
- Add native-maturity badges.
- Add a guided gallery route with three proof beats.
- Keep Path & Scope as the guide-layer/scope reference.

## Stop Conditions

- Do not promise live zero-expression pick-whippable outputs until AE proves a
  supported publishing path.
- Do not let plugin-let/compiler work delay the Signal Rack V1 native gate.
- Do not let the demo gallery replace the native acceptance test.
