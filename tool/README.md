# Signal Rack — Signal Lab (web tool)

The first showable deliverable: a browser **playground to experiment with
signals** — generate them, **represent them many ways**, and **see what they
practically do** when they drive a property.

## Run it
WebGPU + loading the `.wgsl` need a server (not `file://`):
```bash
cd <repo root>
python3 -m http.server 8000
# open http://localhost:8000/tool/
```

## Generate
Two independent generators (**Channel X / Y**): source (sine/pulse/ramp/noise/
random-walk), rate, phase, amount, offset, smooth, seed. Presets for quick
interesting states. Window / persistence / freeze. **Export recipe JSON** to
capture an experiment as a Signal Rack recipe.

## Process (the "shape" verb)
A **Processor** stage shapes Channel X between generate and apply: Gain, Bias,
Quantize, Gate (threshold), Lag, plus Invert / Rectify. This is the other half
of the rack — turning a raw oscillation into a usable control (a gate, a stepped
value, a lagged follower). It runs identically on the WebGPU and CPU paths.

## Represent (the same signal, many ways)
A mode switcher changes how the screen draws the signal:
- **Waveform** — classic oscilloscope traces (X green, Y amber).
- **Bars** — column meter view.
- **Vectorscope** — X vs Y with phosphor persistence → Lissajous figures.
- **Polar** — the signal as a radial/rose plot.
- **Heat strip** — value mapped to colour over the window.

## Apply (see the practical use)
**Applied** mode maps Channel X through an output range onto a real
motion-graphics property and shows a live demo object reacting — *and prints the
AE expression it would generate*. This is the controller workflow, visible:
- Scale · Rotation · Position · Opacity/flicker · Glow · Colour (hue)
- Bar meter + gate · **Particles** (birth driver) · **Kinetic type reveal**

So you can watch a pulse become a logo pulse, a random walk become camera drift,
a gate spawn particles — the point being *what the signal is for*, not just its
shape.

## The math drawer  ƒ(t)
A drawer at the bottom expands to show the **live mathematical expression** for
the current signal — the source term, normalization, smoothing, the processor
chain, and (in Applied mode) the full hand-written equivalent, e.g.
`scale(t) = 80 + 40·clamp(0.5·(1 + sin(2π·2t)), 0, 1)`. The point: you could dial
it in above — or figure out and write *that* by hand. It also prints the AE
expression form.

## Engine
Runs the validated engine. Badge (top-right) shows the active path:
- **WebGPU** — dispatches the real `shaders/signal_core.wgsl` (product engine).
- **CPU reference** — bit-identical `signal-core-reference.js` fallback so a demo
  always renders. Identical output by design (`prototypes/webgpu-lab/validate.js`).

This is the dev/preview surface; the same engine is exposed natively in After
Effects through the Dawn bridge (repo root `README.md`).
