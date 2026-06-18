# Demo Plan — Path & Scope

**Positioning:** the demo that shows the *raw signal as geometry* — an object
rides the waveform, a dot traces the vectorscope, curves bloom from the buffers.
Lower standalone value (Lab flourish per the breakup) but the best teaching
surface for "this is literally the signal," and a clean home for the scope/guide
visuals that *do* ship inside Signal Rack.

## Variants (port from `drawApplied()` Path category)
Wave-runner (`trace`), Vectorscope dot (`orbitPath`), Spirograph (`spiro`),
Rose curve (`rose`).

## Controls
- **Structure:** path type; turns/petals (k); radius; line weight; trail/persist.
- **Signal:** built-in driver or external recipe; reads raw `bufX`/`bufY`.
- **Shaping:** which buffer drives radius vs. angle; head-dot tracking;
  combine mode (the Drive selector); distort depth.

## MVP (first loop slice)
Wave-runner (port `trace`): draw the combined driver across the window as a path;
a glowing head dot rides the live end value. One preset.

## Roadmap
1. MVP wave-runner. 2. Vectorscope dot (live X/Y point). 3. Spirograph
(angle sweeps, radius = `bufX`). 4. Rose curve (k petals from `n`).
5. Promote wave-runner + readout as the **Signal Rack guide-layer scope**.

## Notes
This is where the Drive-combine selector (X·Y·ring·mix·diff·min·max) is most
legible — surface it prominently as a teaching control.
