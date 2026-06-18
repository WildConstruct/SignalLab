# Demo Plan — FUI Kit ("Heads-Up")

**Positioning:** the lead generator. FUI/HUD artists hand-wire these constantly;
this is the strongest standalone demand and the clearest "Trapcode doesn't have
this" pitch. A library of HUD widgets where a signal in the background decides
*which elements fire and in what sequence* — not just global gain.

## Widgets (port from `tool/index.html` `drawApplied()`)
Radar sweep (`fuiRadar`), Oscilloscope (`fuiScope`), Progress arc (`fuiArc`),
Equalizer (`fuiBars`), Targeting reticle (`fuiReticle`), Waveform ring
(`fuiWaveRing`), Gyro rings (`fuiGyro`), Data stream (`fuiStream`), **Synapse net
(`fuiSynapse`), Data packets (`fuiPackets`), Processor die (`fuiCore`)**.

## Controls
- **Structure:** widget picker; node/lane/band count; connectivity (edge degree);
  layout (free / grid / radial); ring count; glyph set; seed; palette.
- **Signal:** built-in driver (default) or external recipe; `n` + raw buffers.
- **Shaping:** `Fire ≥` activation threshold; field mapping (uniform / sweep /
  per-element stagger); edge-propagation speed; brightness/charge depth.

## MVP (first loop slice)
Synapse net only: `seed → node count (11–19) + per-node connectivity (1–3)`
(Structure); `act(i)=combine(bufX,bufY)` in background (Signal); `Fire ≥`
threshold lights nodes + ripples a pulse along edges (Shaping). One preset
("Neural Net"). Port `fuiSynapse` verbatim, then lift its constants to controls.

## Roadmap
1. MVP synapse net. 2. Add packets + processor die + widget picker.
3. Add the remaining HUD widgets (radar/scope/arc/bars/reticle/ring/gyro/stream).
4. Sequenced firing (edge propagation + phase stagger); equalizer travelling wave.
5. Meters fold-in (shared audience) + presets + external signal + AE expression.

## Notes
The synapse net is already the reference implementation of Structure/Signal/
Shaping — use it to validate the shared `controls.js` field-mapping kit first.
