# Demo Plan — Transitions

**Positioning:** signal-shaped *animate-ins*. A playhead ramps 0→100% and the
signal shapes the **pace** of an always-climbing (monotonic) progress, or sweeps
a reveal. The "Load In" showcase made concrete.

## Variants (port from `drawApplied()`)
Loading bar (`trLoad`), Wipe reveal (`trWipe`), Text reveal (`trText`), Radial
fill (`trRadial`), Sweep meter (`trMeter`).

## Controls
- **Structure:** variant; bar/radial geometry; text content + layout; segment count.
- **Signal:** built-in driver or external recipe; plus a **playhead** (transP)
  with Freeze-to-hold (so you can watch the curve sweep).
- **Shaping:** progress easing; signal-vs-monotonic blend (loaders climb;
  sweep-meter reads raw); per-letter stagger for text reveal; rise depth.

## MVP (first loop slice)
Loading bar with monotonic, signal-shaped fill pace (port `trLoad` +
`loadProgress`) and the sweep playhead UI. One preset.

## Roadmap
1. MVP loading bar + playhead. 2. Wipe + radial-fill. 3. Text reveal
(per-letter staggered rise shaped by `bufX`). 4. Easing controls + field
mapping. 5. Presets + external signal + AE expression handoff.

## Notes
Monotonic-progress logic already exists (`loadProgress`); reuse it so loaders
never visually regress when the raw signal dips.
