# FUI Kit (demo)

HUD widgets where a signal in the background decides **which elements fire and
in what sequence**. MVP ships the **Synapse net** (ported from the tool's
`fuiSynapse`); more widgets per `docs/web-demos/fui-kit.md`.

Open `index.html` via a static server from the repo root:

```
python3 -m http.server   # then visit /demos/fui-kit/
```

## Controls
- **Structure** — *Nodes*, *Connectivity*, *Seed* (the seed reshapes the whole net).
- **Signal** — *Source*, *Rate*, *Combine* (X·Y…), *Speed*: the driver in the background.
- **Shaping** — *Fire ≥*: the activation threshold deciding which nodes light and
  ripple a pulse along their edges.

## How the signal drives it
Each node samples the combined driver (`combine(bufX[i], bufY[i])`) at a
seed-derived offset, so different nodes read different points of the signal and
fire at different times. Nodes above `Fire ≥` glow and emit an expanding ring;
active edges carry a travelling pulse. The renderer never does signal math — it
reads `bufX`/`bufY` from the shared engine and uses the engine's own `combine()`.
