# FUI Kit (demo)

HUD widgets where a signal in the background decides **which elements fire and
in what sequence**. Current variants include Synapse net, Data packets,
Processor die, Equalizer, Radar, Telemetry, Radial bins, Reticle, Compass, Globe,
and 2.5D die/hex experiments.

Open `index.html` via a static server from the repo root:

```
python3 -m http.server   # then visit /demos/fui-kit/
```

## Controls
- **Structure** — widget-specific controls such as nodes/connectivity, lanes,
  grid size, bands, blips, rings, and seed.
- **Signal** — *Source*, *Rate*, *Combine* (X·Y…), *Speed*: the driver in the background.
- **Shaping** — field map, response, `Fire ≥`, edge speed, sequencing, and depth
  controls that decide where the signal appears inside the structure.

## How the signal drives it
Each widget samples the combined driver (`n`) or the raw buffers (`bufX`/`bufY`)
at structure-specific offsets. Nodes, cells, bands, blips, and rings fire or
drift at different times while the renderer stays out of signal math; it reads
the shared engine output and maps it onto the chosen instrument.
