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

---

## Next FUI modules (roadmap, 2026-06-18)

Built so far: Synapse net · Data packets · Processor die · Equalizer · Radar ·
**Telemetry stack** (new). Proposed next, each built on *signal decides which
elements fire & in what sequence* + *designer sizes by count/extent at a fixed
element size*:

1. **Reticle / Lock-on** — targeting reticle; brackets snap + colour flips to
   "lock" past Fire; ring spin from signal. Size: reticle radius, bracket count.
2. **Radial Spectrum** — circular equalizer; bars radiate from a ring (sweep ⇒
   travelling wave). Size: radius + bar count.
3. **Hex Grid** — honeycomb of hex cells (Die's sibling on a hex lattice). Size:
   cols × rows of hexes at fixed hex size.
4. **Waypoint Markers** — scattered HUD target brackets; each locks/labels when
   its field sample fires. Size: marker count + spread (W×H).
5. **Flow Diagram** — boxes joined by orthogonal routed wires; pulses travel
   routes in sequence. Size: node count + canvas spread.

Status: Telemetry stack DONE. Order TBD with Brian (first pick: Telemetry).

## Designer-sizing audit (apply across ALL modules)
Principle: element size is fixed; explicit count/extent controls grow the artwork;
no aspect distortion (uniform shrink-to-fit only).
- [x] FUI Processor die — Cell size + Columns/Rows grow the grid.
- [x] FUI Equalizer — Bar width + Bands grow total width.
- [x] FUI Telemetry — Row height + Lines grow the stack.
- [x] Meters LED ladder — fixed segment size; segments grow the ladder.
- [ ] Particles — explicit field width/height for stream/fountain extent.
- [ ] Path & Scope — confirm radius/turns read as size (largely done).
- [ ] Kinetic Type — explicit font-size control (currently auto from width).
- [ ] Meters bar/radial — expose size (bar length / gauge radius).
- [ ] Glitch — confirm block size / scan gap behave as fixed-element sizes.

## Architecture: FUI primitive kit (2026-06-18)
Per direction: a curated, signal-aware draw-helper library (`demos/shared/fui.js`)
— NOT a drag-and-drop builder — so new widgets compose from shared parts and
fill the Huds+Guis vocabulary cheaply and consistently. Existing widgets are
left untouched; new ones build on it.
- [x] `fui.js`: `lit` (shared glow), `cell`, `hexCell`, `tickRing`, `arc`,
      `bracket`, `needle`, `readout`.
- [x] **3D Processor Die** — first widget built on the kit + composition: a
      depth stack of die layers, each reading a different slice of the wave,
      drawn back-to-front. Opens a 2.5D direction for other widgets.
- [x] **Hex grid** + **Hex grid (3D)** built on the kit (FUI.hexCell).
- [x] 3D widgets gained **Depth offset** (dial the 3D-ness) + **Off-cell opacity** (fade/hide off cells so lit cells float — no camera).
- [x] Built on the kit: **Radial spectrum**, **Reticle / lock-on** (with
      callouts toggle), **Compass strip**, **Wireframe globe / orbit**.
      FUI Kit now ships 13 widgets.
- Note: 3D/volumetric variants are an interesting direction for several widgets
      (e.g. stacked slices), enabled by the kit.
