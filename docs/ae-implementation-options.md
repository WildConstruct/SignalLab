# AE Implementation Options

Answers required first-pass question **1** ("most viable first implementation path"),
**12** (not feasible without native plugin), **13** (not feasible without a panel),
**14** (deferred).

Legend: **[C]** confirmed by AE docs / long-standing stable behaviour ·
**[I]** inferred, needs in-AE verification · **[X]** rejected for v1.

---

## 1. The path we chose: **Script-assisted Expression-Control rig** (hybrid, script-light)

The Signal Rack is a **control layer** carrying a stack of **Expression
Controls** (Slider / Angle / Point / Color / Checkbox / **Dropdown Menu**
Control). The three **Output** sliders each carry the **signal-engine
expression** that generates the value over time. Targets pick-whip those
output sliders. A small **ScriptUI panel** (`SignalRack.jsx`) automates
building the rig, binding, chaining, scope, and bake — but **nothing the
script does is load-bearing at render time**. Once built, the rig is pure
AE objects + expressions and runs with the panel closed, on any machine,
forever. **[C]**

### Why this wins

| Criterion | Result |
|---|---|
| Works with one rack, no panel open | **Yes** — outputs evaluate from expressions alone |
| Pick-whippable outputs | **Yes** — output sliders are ordinary properties |
| Survives sharing the project | **Yes** — no plugin/panel install needed to *play* |
| Chainable (sidechain) | **Yes** — pick-whip into an Input slider |
| Bakeable / detachable | **Yes** — `setValuesAtTimes` + remove expression |
| Build effort | **Low** — one .jsx, no compilation, no signing |
| Matches existing AE mental model | **Yes** — it *is* the controller-null/slider workflow, productized |

This is the literal embodiment of the north-star: *safe, visible,
pick-whippable control outputs without a modular programming environment.*
The "patch cable" is AE's own pick-whip.

---

## 2. Options considered and rejected (or deferred) for v1

### 2a. Native AE effect plugin (C/C++ SDK) — **[X] deferred**
A real `PF_Effect` could expose typed parameters and do fast pixel work on the
GPU. But:
- Requires C++ build toolchains per-OS, code signing, notarization, installer. **[C]**
- An effect's parameters **are** pick-whippable, but you still cannot beat the
  zero-install share story of pure expressions for a prototype. **[C]**
- **Only a native plugin can:** sample pixels fast/cached across the whole
  frame, hold true stateful DSP (one-pole filters, hysteresis, sample-and-hold
  with real memory), guarantee evaluation order, and own a custom UI inside the
  Effect Controls panel. These are the things to revisit **after** the workflow
  is proven. **[I]**
- **Verdict:** the right *eventual* engine home, wrong first step. Defer.

### 2b. Pure script-created preset, no panel (`.ffx` / animation preset) — **[partially adopted]**
You can save the built rack layer (or the effect stack) as an **animation
preset (.ffx)** so users apply it without the script. **[C]** We keep this as a
**distribution format** (see `prototypes/ae-presets/`), but the script remains
the authoring tool because presets can't *bind targets* or *chain* for you.

### 2c. CEP panel — **[X] for the core product**
CEP (HTML/JS panel) is mature and still supported, and could host a nicer scope
and recipe browser. But CEP as the **core** product violates the guardrail "no
giant panel before validating one rack driving one property." CEP also still
drives AE through the same ExtendScript DOM under the hood — so it buys UI, not
new capability. **Revisit as a convenience shell later.** **[C]**

### 2d. UXP panel — **[X] for this workflow, today**
Adobe is moving panels toward **UXP**, and UXP for After Effects has been
arriving in stages. As of this writing UXP-for-AE scripting coverage has
historically lagged the classic ExtendScript DOM for deep timeline/expression
automation, so betting the prototype on it adds risk for no v1 payoff.
**[I — verify current UXP-for-AE API coverage before any panel investment.]**
Decision: stay on ExtendScript for the prototype; treat UXP as the eventual
panel runtime once the workflow is proven and the DOM gaps are confirmed closed.

### 2e. Full node editor / patch-cable canvas — **[X] explicit non-goal**
Out of scope by product mandate. Chaining is done by pick-whip, not cables.

---

## 3. What is **not feasible without a native plugin** (Q12)

- **Fast, cached, full-frame pixel analysis.** `sampleImage` in an expression is
  per-property, per-frame, CPU-side, and re-evaluated on every dependent read.
  Real probing (motion vectors, histograms, multi-point) wants a plugin. **[C]**
- **True stateful DSP** — genuine one-pole lag, hysteresis with memory,
  sample-and-hold, slew limiting, feedback. Expressions can't read their own
  past output without O(timeline) recursion. We approximate with finite-window
  math; the real thing needs a plugin (or bake). **[C]**
- **Guaranteed evaluation order / sample-rate independent timebase** (CHOP-style
  sub-frame samples). AE evaluates per-frame; a plugin owns its own clock. **[C]**
- **Custom in-effect UI** (a real scope inside Effect Controls, grouped/foldable
  parameters beyond what Expression Controls give). **[C]**

## 4. What is **not feasible without a panel** (Q13)

Very little is *blocked* without a panel, but these are **clunky** without one:
- One-click **target binding** with overwrite protection (you can pick-whip by
  hand, but the assisted bind + range remap is nicer from UI). **[C]**
- **Recipe browse / apply / save** UI. **[C]**
- **Chaining picker** (you can pick-whip an Input slider by hand instead). **[C]**
- **Bake controls** with simplify tolerance UI. **[C]**

None of these are *capabilities* — they're ergonomics. The panel is sugar, not
substrate. That is exactly the property we want for v1.

## 5. Deferred (Q14)

- Native plugin engine · CEP/UXP shell · real audio analysis (lean on AE
  *Convert Audio to Keyframes* + Visualizer later) · motion-vector probe ·
  Wild Construct payload transport · keyframe-simplify-with-tolerance (ship
  dense bake first) · color/point output profiles beyond the scalar core ·
  MIDI/OSC/hardware/cloud (hard non-goals).
