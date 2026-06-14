# Signal Rack — Signal Generator (web tool)

The first showable deliverable: a browser **signal generator** with an
oscilloscope-style **waveform** and an X-Y **vectorscope**. Two independent
channels (X, Y) make the vectorscope draw real Lissajous figures — the
"scientific instrument" surface from the memo (scopes create trust).

## Run it
WebGPU + loading the `.wgsl` need a server (not `file://`):
```bash
cd <repo root>
python3 -m http.server 8000
# open http://localhost:8000/tool/
```

## What you get
- **Channel X / Channel Y** generators: source (sine/pulse/ramp/noise/walk),
  rate, phase, amount, smooth, seed.
- **Waveform scope**: X (green) + Y (amber) traces over a scrolling window, with
  graticule and live readout.
- **Vectorscope**: X vs Y with phosphor persistence and a circular graticule.
- **Presets**: Circle 1:1, Lissajous 2:3 / 3:4, Pulse × Sine, Noise cloud.
- **Display**: window length, persistence, freeze.

## Engine
Runs the validated signal engine. The badge (top-right) shows the active path:
- **WebGPU** — dispatches the real `shaders/signal_core.wgsl` (the product engine;
  "develop in WebGPU first"). Auto-selected when the browser supports it; click
  the badge to (re)try.
- **CPU reference** — the bit-identical `signal-core-reference.js` fallback so a
  demo always renders. Both feed the same scopes; output is identical by design
  (see `prototypes/webgpu-lab/validate.js`).

This tool is the dev/preview surface; the same engine is exposed natively in
After Effects through the Dawn bridge (see the repo root `README.md`).
