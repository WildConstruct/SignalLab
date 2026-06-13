# Feasibility Notes

Answers first-pass questions **2–11**. Status tags: **[C]** built/ran here ·
**[I]** inferred from AE docs + Etheros conventions, needs in-AE verification.

Architecture reminder: the engine is `signal_core.wgsl` driven through the Dawn
bridge; the AE plugin exposes its parameters. "Outputs" are the plugin's three
**output params**, fed by interpreted scalars from the shader.

---

## Q2 — Can an effect expose stable pick-whippable outputs?

**Yes. [I]** An AE effect's parameters are first-class properties; any other
property can pick-whip them, e.g.
`thisComp.layer("SR · Pulse Driver").effect("Signal Rack")("Output A")`. Because
Output A/B/C are **effect params written by the plugin each frame** (from the
shader's interpreted scalars), they read as ordinary animatable values. This is
strictly more stable than the expression-slider approach because the value is
produced by the plugin, not a fragile expression the user can break.

## Q3 — Which AE property types for outputs?

**Slider is the default and primary. [C for rationale]** Sliders cost the least
to read in expressions, pick-whip everywhere, and serialize cleanly to the
shader's scalar contract. Profile → AE type mapping (see
`schemas/output-profile.schema.json`):

| Profile | AE output type |
|---|---|
| Normalized, Signed, Percentage, Pixels, Custom, Gate, Trigger | **Slider** |
| Degrees | Slider (preferred) or **Angle** |
| (future) 2D/3D vector | **Point** |
| (future) color driver | **Color** |
| Gate as a toggle UI | Checkbox — but Slider is easier for expressions |

v1 ships **scalar (Slider) outputs only**; Angle/Point/Color are deferred.

## Q4 — Best way to support three inputs and three outputs natively?

**Plugin params: 3 Input sliders + 3 Output sliders, grouped. [I]** Inputs are
plain sliders the user **pick-whips INTO** (sidechain). Outputs are
plugin-written sliders the user **pick-whips FROM**. The shader evaluates all
three outputs in one dispatch (one `vec4` per sample: `n, A, B, C`), so three
outputs cost the same as one. Three is a deliberate constraint — complexity
comes from **chaining instances**, not bloating one.

## Q5 — Can a rack output feed another rack input cleanly?

**Yes. [C in the WebGPU lab]** Rack B's `SourceType = Linked` reads its Input A.
The host resolves Input A to a single scalar (Rack A's Output A at the current
time) and passes it in the render request (`resolvedInputA`). The browser lab
demonstrates two chained racks updating live; `validate.js` asserts Rack B
reflects Rack A. In AE this is just pick-whipping Rack B's Input A slider to Rack
A's Output A — no node graph.

## Q6 — What do the generated references look like?

- **Target reads Output A** (pick-whip, no math):
  `thisComp.layer("SR · Pulse Driver").effect("Signal Rack")("Output A")`
- **Rack 2 Input A reads Rack 1 Output A** (sidechain): pick-whip Input A to the
  same path above. The plugin then evaluates with `SourceType = Linked`.
- **Target remaps a normalized output** (when you want target-side mapping):
  ```
  s = thisComp.layer("SR · Pulse Driver").effect("Signal Rack")("Output A");
  linear(s, 0, 1, 80, 120)
  ```
  Prefer **output-side mapping** (set the range on the rack via the output
  profile) so the value is correct at the source and the pick-whip stays
  math-free. Use target-side `linear()` only for one-off retargets.

## Q7 — How fragile are references?

| Reference by… | Fragility | Mitigation |
|---|---|---|
| Layer **name** | Breaks if renamed | Moniker auto-name + short `id` in the layer name; a future repair pass matches by the rack marker `id` |
| Effect **name** | Stable within a layer | One "Signal Rack" effect per rack layer |
| Effect **index** | Breaks on reorder/duplicate | Never reference by index; always by name |
| **Duplicate** effects/layers | AE resolves duplicate names to the topmost; ambiguous | Unique `id` in layer name; warn on duplicate |
| **Renamed** layers | Breaks pick-whips | Bake = escape hatch; repair by `id` |
| **Precomp** | Path must include the precomp; cross-comp refs are brittle | Keep a rack and its targets in the same comp; document |

**[I — all standard AE expression-reference behaviour; verify edge cases in-app.]**

## Q8 — Safest naming/linking convention

- Layer: `SR · <Moniker> [id:<shortid>]` (auto via `core/signal_moniker.h`).
- Effect: a single `Signal Rack` effect per layer; outputs named `Output A/B/C`.
- A **marker** on the rack layer carries `signal-rack id:<id> v:<ver>` as
  machine-readable identity that survives renames (used by a future repair tool).
- Prefer **same-comp** references; prefer **output-side** range mapping.

## Q9 — Guide-layer visualization with ordinary AE layers?

**Yes. [I]** A shape layer with a path expression that reads the output param
back over a time window draws a **waveform**; a text layer reads `.value` for a
**numeric readout**; rectangles keyed on the gate output give **gate blocks**.
Set these layers as **Guide Layers** so they show in the viewer but are excluded
from final render. (The browser lab already renders live scopes from the same
data, proving the visual model.) **[C for the model; in-AE guide-layer render
exclusion is well-documented but verify.]**

## Q10 — Luma probe via pixel sampling?

**Two paths.** The **prototype** path is the AE expression `sampleImage(point,
radius, postEffect, t)` returning averaged `[r,g,b,a]`; `radius=[0.5,0.5]` = 1×1,
`[2.5,2.5]` = 5×5. The **production** path (chosen) is the plugin: it samples the
source layer's pixels on the GPU/host and feeds per-sample luma into the shader's
`lumaIn` buffer, then smoothing/threshold happen in WGSL. Probing should be
**analyze-and-cache** (bake) for performance; live sampling is preview-grade.
Speed/accuracy/color-management caveats are in `tests/luma-probe-tests.md`. **[I]**

## Q11 — Bake outputs to keyframes via scripting?

**Yes. [I]** `tooling/ae/SignalRack-binding-helper.jsx` samples a property over
the work area with `valueAtTime` and writes keyframes via `setValuesAtTimes`,
optionally disabling/removing the expression so the target **detaches** from the
live rack. Bake the **output param** or the **target** directly; dense first,
simplify-with-tolerance later. Live vs baked comparison method in
`tests/bake-tests.md`. **[I — script written to the documented DOM; not yet run
in AE.]**
