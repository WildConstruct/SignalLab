# Signal Rack — Demo Lab (`demos/`)

The working nine-module suite: seven product demos plus two Etheros convergence
demos, all running over shared Signal Rack demo infrastructure. The product demos
use one shared signal engine + per-product renderers, each built on the
**Structure / Signal / Shaping** control language. This is the executable
counterpart to the strategy in
[`docs/product-breakup.md`](../docs/product-breakup.md) and the plans in
[`docs/web-demos/`](../docs/web-demos/README.md).

## Run it
From the repo root (the demos load the shared engine via relative paths):

```
python3 -m http.server
# then open http://localhost:8000/demos/
```

The launcher (`demos/index.html`) links all nine modules with live signal
thumbnails.

## Layout
```
demos/
  index.html          launcher gallery (live sparkline thumbnails)
  shared/
    signal-engine.js  the driver: two SignalCore.Rack channels + combine + toExpression
    controls.js       schema-driven three-tier panel (Structure/Signal/Shaping)
    shaping.js        field-mapping (uniform/sweep/radial/stagger) + response + PeakHold
    host.js           boot + render loop + presets/import/export + ƒ AE expression
    style.css         shared palette/typography
  <demo>/             index.html + render.js + presets.js + README.md
```

## The seven product demos
| Demo | Variants |
|---|---|
| **fui-kit** | Synapse net · Data packets · Processor die · Equalizer · Radar |
| **glitch-distortion** | Sync drift + chroma · block displacement · pixel-sort · dropout |
| **transitions** | Loading bar · wipe · radial · text-reveal (+ easing) |
| **kinetic-type** | Wave · pump · RGB glitch · shake |
| **meters** | Bar + gate · radial gauge · LED ladder (peak-hold) |
| **particles** | Fountain · shock rings · stream field |
| **path-scope** | Wave runner · vectorscope · spirograph · rose |

## Field convergence demos
| Demo | What it proves |
|---|---|
| **field-bridge** | Signal Rack drives a real Etheros field parameter in-browser. |
| **field-distort** | An Etheros field distorts a FUI plate while Signal Rack pulses the warp. |

## Contract every renderer obeys
Renderers read only `n` / `bufX` / `bufY` from the shared driver and never do
signal math — the CPU reference engine
(`prototypes/webgpu-lab/signal-core-reference.js`) stays the parity oracle, so a
look authored here is portable to the After-Effects plugin unchanged (and any
demo can copy a self-contained AE expression via **ƒ AE**).

## Adding a demo
Scaffold `demos/<name>/` with `index.html` (copy an existing one — it just wires
the shared scripts + `SignalHost.boot`), a `render.js` exporting
`Demo = { title, driver, structure, shaping, presets, render }`, a `presets.js`,
and a `README.md`. Add it to the launcher's `DEMOS` array.

See the Notion sub-project
**[Signal Rack — Web Demos (Engineering)](https://app.notion.com/p/383b77d6cd4f81699963d80c643576a5)**
for the running build log.
