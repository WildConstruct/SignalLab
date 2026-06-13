# Feasibility finding: how a native effect publishes pick-whippable outputs

This is the crux question (memo Q2) and it has a sharp edge worth stating plainly,
because it shapes the whole product.

## The constraint
In After Effects, **an effect's parameters are inputs.** A param's value is what
the user set (or what an expression/keyframes on that param produce). An effect's
`Render()` computes pixels; it does **not** get to write a freshly-computed scalar
back onto its own slider such that *other* properties pick-whip it and read the
live value during the same evaluation pass. There is no supported "effect emits a
live output stream" mechanism. **[I — strong, from the SDK/expression model;
worth a hands-on confirmation, but do not assume a hidden path exists.]**

So "the plugin computes Output A in WGSL and other layers pick-whip it live" is
**not** directly true the way the memo imagines.

## What therefore IS feasible (and is the v1 plan)

Three coupling modes, in order of robustness:

1. **Bake (fully supported, robust).** An AEGP companion evaluates the engine
   (WGSL/Dawn) over the work area and writes the interpreted scalars as
   **keyframes** onto the Output A/B/C sliders (or directly onto the target).
   Downstream pick-whips then read ordinary keyframed values. Deterministic,
   shareable, no plugin needed to play back. This is the escape hatch *and* a
   primary path. `tooling/ae/SignalRack-binding-helper.jsx` already does the
   keyframe-writing half; the engine-evaluation half moves to the AEGP/Dawn side.

2. **Live via a thin expression bridge.** Each Output slider carries a *one-line*
   expression that returns a value the AEGP companion has cached for the current
   time (e.g. the companion evaluates the engine on idle/preview and stores the
   sample; the expression reads it). Downstream pick-whips read the slider as
   normal. The heavy compute (probes, DSP) still lives in WGSL; the expression is
   a courier, not the engine. **[I — needs prototyping; cache freshness during
   playback is the risk.]**

3. **Guide-layer preview (always available).** The effect renders the waveform /
   value / gate state into the comp viewer so the user *sees* the signal even
   before binding. Pure pixels; no publishing needed.

## Why the WGSL/Dawn engine is still the right call
The constraint is about *where AE lets you read a value*, not about *who computes
it*. The engine must still be WGSL/Dawn because:
- the **luma probe** needs real pixel access + speed,
- **bake** needs a fast, deterministic evaluator over many frames,
- heavier DSP and cross-product reuse (Entropy/Cathode) need the shared runtime.

The AE side is thin either way: it either **bakes** engine output to keyframes or
**couriers** a cached sample through a one-line expression.

## Honest implication for the north-star
"Pick-whippable outputs without writing expressions" is achievable for the
**bake** path with zero user-facing expressions, and for the **live** path with a
single auto-generated courier expression the user never has to author. We should
*not* promise a live, zero-expression, plugin-published output until mode 2 is
proven on real playback.

## Open question for Harry
Is there an AEGP/dynamic-stream technique (or a newer SDK affordance) that lets an
effect publish a computed value read by expressions *live*, that I'm not aware of?
If yes, mode 2 simplifies dramatically. If no, v1 leads with **bake**, with live
preview via the guide layer + courier expression.
