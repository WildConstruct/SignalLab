# Signal Rack — Signal Lab (web tool)

A browser **playground to experiment with signals** — generate them, shape
them, see them drive motion / FUI / transitions, and (the punchline) **copy the
exact result out as a self-contained After Effects expression**. Everything runs
on the same WebGPU engine the After Effects Dawn bridge uses, so a look you dial
in here is reproducible natively.

> There's an in-app **? Guide** (top-right) with the short version. This file is
> the fuller reference.

## Run it
WebGPU + loading the `.wgsl`/icons need a server (not `file://`):
```bash
cd <repo root>
python3 -m http.server 8000
# open http://localhost:8000/tool/
```
It's also deployed to GitHub Pages: **https://wildconstruct.github.io/SignalLab/tool/**
(and installable to a phone home screen — it ships a web-app manifest + icon).

## 1 · Generate
Two independent generators, **Channel X** and **Channel Y**. Each has a
**Source** (Sine, Square, Saw, Triangle, Pulse, Noise, Random Walk) and
**Rate, Phase, Amount, Offset, Smooth, Seed**. Seed re-rolls the random sources
and shifts the wave.

- **Oscillators** — the small **“o”** beside Amount/Phase slowly oscillates that
  value (a macro LFO), so a parameter breathes on its own.
- **Channel Y link** — **Sync to X** makes Y identical to X; **Invert (mirror X)**
  makes Y = 1−X. Great for clean diagonal / mirrored figures.

## 2 · Shape
- **Processor** (shapes Channel X): gain, bias, saturate, warp, fold, gate,
  quantize, lag, invert, rectify.
- **Window** — a feathered region that fades the signal in/out across the scope.
- **Sidechain** — Channel X modulates Channel Y’s **amplitude (AM)**, **rate (FM)**
  or **phase**, with depth.
- **Distort** — a gentle third signal that phase-bends both channels.

## 3 · Represent
Tabs switch how the scope draws the signal:
**Waveform · Bars · Vectorscope · Polar · Heat**, plus **Applied** (below).
Display controls: **Speed** (master time scale, with ÷2 / 1×), **Window** (scope
length), **Persist** (trail), **Freeze** (hold the signal), **CRT** (Cathode tube
look), **Y opacity**.

## 4 · Apply — what the signal is *for*
**Applied** mode runs the signal through a **Drive** combiner and into a live
demo. **Drive** = Channel X · Y · X×Y (ring) · mix · difference · min · max.
Categories:

- **Transform** — scale (uniform / X / Y), rotation, position X/Y, opacity, skew.
- **Visual** — glow, colour (hue), strobe, ring pulse, defocus blur, gradient sweep.
- **Meter** — bar + gate, radial gauge, LED ladder, stereo bars, histogram, dial.
- **FUI** — HUD widgets: radar sweep, oscilloscope, progress arc, equalizer,
  targeting reticle, waveform ring, gyro rings, data stream, and the **firing**
  set — **Synapse net, Data packets, Processor die** — that light up where the
  signal is active. **Fire ≥** sets how active it must be; **Seed** reshapes the
  synapse map (node count + connectivity) and varies the other firing widgets.
- **Transitions** — a playhead ramps **0→100%** across the signal; turn on
  **Freeze** to hold the curve and watch it sweep. Loading bar / radial fill use a
  *monotonic* (always-climbing) progress shaped by the signal; sweep meter reads
  the raw value; wipe / text reveals are animate-ins.
- **Particles** — fountain, shock rings, stream field, orbit swarm, confetti,
  starfield warp.
- **Text** — kinetic wave, word opacity, title pump, RGB glitch, typewriter,
  counter, shake.
- **Path** — wave-runner, vectorscope dot, spirograph, rose curve.

Range-based variants (transform/visual/meter) expose **Output range** (min→max);
others ignore it.

## 5 · Use it
- **ƒ AE expression** (Applied drawer) — the **full, self-contained** After Effects
  expression. It reproduces the entire driver: both channels, processor, window,
  distort, oscillators, sidechain, the selected Drive combine, and the master
  **Speed** time-scale — mapped to the property range. Copy it onto any property;
  no plugin required. (FM sidechain is approximated as a phase vibrato; that's the
  only non-exact part, and it's commented.)
- **Record video** — captures the visualization (scope + CRT) to mp4 where the
  browser supports it, else webm.
- **Copy link** / **Export JSON** — the whole setup round-trips in a URL hash or a
  recipe file; **Import** restores it.
- **🎲 Surprise me** — rolls a tasteful random rig.
- **Presets** — quick starting points, including showcases that open straight
  into a category (Neural Net, Radar, Equalizer, Processor, Load In, Title Pump).

## The math drawer  ƒ(t)
A drawer at the bottom shows the **live mathematical expression** for the current
signal — source term, normalization, smoothing, the processor chain, and (in
Applied) a copy of the full AE expression. The point: you could dial it in
above… or write *that* by hand.

## Shortcuts
**Space** / **F** freeze · **R** surprise · **P** present · **Esc** exit /
close · **?** open the Guide · **double-click a slider** resets it.

## Engine
The badge (top-right) shows the active path:
- **WebGPU** — dispatches the real `shaders/signal_core.wgsl` (the product engine).
- **CPU reference** — a bit-identical `signal-core-reference.js` fallback so the
  demo always renders. Parity is enforced by `prototypes/webgpu-lab/validate.js`.

This is the dev/preview surface; the same engine is exposed natively in After
Effects through the Dawn bridge (see the repo-root `README.md`).

## Files
- `tool/index.html` — the whole tool (markup + styling + engine host + render).
- `tool/cathode-crt.js` — the real 2-pass Cathode CRT/NTSC WebGPU overlay.
- `tool/manifest.webmanifest`, `tool/icon-*.png`, `tool/make-icons.js` — the
  installable-app icon + manifest (`make-icons.js` regenerates the icons from
  `icon-src.png`, dependency-free).
- A `BUILD` string (console log + logo tooltip) identifies the loaded build — handy
  for spotting a stale cache after a deploy.
