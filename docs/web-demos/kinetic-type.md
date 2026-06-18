# Demo Plan — Kinetic Type

**Positioning:** signal-driven type. A taste of the suite that's also a genuine
utility — drive kinetic text without hand-writing per-letter expressions.

## Variants (port from `drawApplied()` Text category)
Kinetic wave (`type`), Word opacity (`textOpacity`), Title pump (`textPump`),
RGB glitch (`textGlitch`), Typewriter (`textType`), Counter readout
(`textCounter`), Shake / impact (`textShake`).

## Controls
- **Structure:** word/phrase; font weight/size; layout (line / arc); glyph spacing.
- **Signal:** built-in driver or external recipe.
- **Shaping:** per-letter field mapping (wave sweep / stagger / uniform);
  shake amplitude on peaks (`Fire ≥`); glitch threshold; pump depth.

## MVP (first loop slice)
Kinetic wave on a word: per-letter vertical offset where the signal sweeps across
letters (position = phase). Port `type`/`trText` per-letter logic. One preset
("Title Pump").

## Roadmap
1. MVP kinetic wave. 2. Title pump + word opacity. 3. Shake-on-peak + RGB
glitch (threshold). 4. Typewriter + counter (drive value through 0→100 remap).
5. Field-mapping selector + presets + external signal.

## Notes
Counter readout is the cleanest demo of the **0→100 response curve** Brian
flagged — wire it to the shared response control as a showcase.
