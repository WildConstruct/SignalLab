# Ferrofluid Demo Design

Date: 2026-06-24
Status: design approved for review

## Goal

Add a new `demos/ferrofluid/` module to Signal Rack's browser demo suite. The
demo should show Signal Rack behaving like a magnetic resonance instrument: the
signal waveform acts as a time-varying magnetic field that pulls a glossy black
ferrofluid blob into lobes, dimples, ripples, beads, and occasional spikelets.

The default look is a blobby reflective ferrofluid form on a bright circular
aperture or clean stage. The classic spiky ferrofluid crown is a high-energy
mode, not the default.

## Positioning

This is a convergence demo like `field-bridge`, but the routed target is a
synthetic magnetic fluid renderer rather than an Etheros field recipe.

Core thesis:

```
Signal Rack waveform -> magnetic field mimic -> ferrofluid height/displacement -> reflective 2.5D render
```

The demo should feel like audio waveforms driving magnetic resonance. It should
not read as a generic black fluid simulation.

## Visual Direction

Primary reference:

- Single hyperblack blobby ferrofluid mass on a bright circular aperture.
- Strong, hard white reflection shapes.
- Very glossy surface with crushed black interiors.
- Slow breathing lobes at low energy.
- Tiny satellite beads or droplets around the main blob.

Secondary references:

- Dark stage with magenta and amber reflection accents.
- Macro ferrofluid spike crown when field strength or resonance is high.
- Lab macro variant with a visible magnet/waterline feeling, deferred until the
  first blob renderer is working.

The visual trick is explicitly 2.5D. The renderer derives a height map from a
2D density/blob mask, computes normals from that height map, and shades it as a
reflective surface. It does not need a true 3D mesh to sell the image.

## Recommended Approach

Use a hybrid implementation path:

1. Adapt the useful solver/runtime concepts from
   `PavelDoGreat/WebGL-Fluid-Simulation` for a browser-first WebGL fluid layer,
   preserving MIT attribution.
2. Wrap the adapted solver behind a small Signal Rack demo API instead of
   copying the upstream application UI.
3. Build the ferrofluid look in a custom displacement/reflection pass on top of
   the density/height field.
4. Keep the renderer API shaped so a later WebGPU/WGSL version can replace the
   WebGL implementation without changing `demos/ferrofluid/render.js`.

This gets a convincing demo quickly while respecting the repo's longer-term
WebGPU/Dawn direction.

## Architecture

### Demo module

Create the standard demo skeleton:

```
demos/ferrofluid/
  index.html
  render.js
  presets.js
  README.md
```

Add it to the launcher and rail lists after `field-distort`.

### Shared renderer

Add a focused shared renderer:

```
demos/shared/ferrofluid-webgl.js
```

This module owns GPU resources and exposes a narrow surface:

```
FerrofluidWebGL.createRenderer(canvas) -> Promise<renderer|null>
renderer.render(frame, width, height)
renderer.dispose()
```

`frame` is the existing Signal Host frame:

```
{ t, n, x, y, bufX, bufY, S }
```

The renderer may internally use ping-pong buffers for density, velocity, height,
normal/reflection, and display. The public API should stay Signal Rack-shaped,
not upstream-fluid-shaped.

### Magnetic field mimic

The field model should be deterministic and waveform-driven:

- `n` controls overall magnetic pull and blob breathing.
- `bufX` shapes angular lobe pressure around the blob.
- `bufY` shapes secondary wobble, bead emission, and phase offsets when the
  selected combine mode uses channel Y.
- Signal rate and smoothing should visibly change how nervous or viscous the
  blob feels.

The magnetic field can be computed as several rotating or radial attractors
around the blob. It only needs to mimic the visible behavior of magnetic
resonance, not solve real magnetohydrodynamics.

### 2.5D reflection pass

The display pass converts the fluid/density state into a reflective surface:

1. Build a soft blob mask from density.
2. Build a height map from mask plus field pressure.
3. Sharpen lobes and optional spikelets from resonance peaks.
4. Compute normals from height gradients.
5. Shade with hyperblack base, white reflection bands, and optional magenta or
   amber accent reflections.
6. Composite droplets and a stage/aperture background.

The first implementation can fake environment reflection with procedural window
strips and curved highlight masks. It does not need loaded HDRI or external
image assets.

## Controls

Follow the existing Structure / Signal / Shaping contract.

### Structure

- `stage`: Aperture, Dark Stage, Macro Plate.
- `blobSize`: main blob scale.
- `surfaceTension`: how strongly the blob pulls back into one mass.
- `droplets`: number or intensity of satellite beads.
- `seed`: deterministic blob/bead layout.

### Signal

Use the default Signal Host source controls, with a built-in driver biased
toward slow resonant motion:

```
x: sine or randomWalk
y: sine/noise
drive: max or mult
```

External recipe import must keep working through the host import path.

### Shaping

- `fieldStrength`: signal-to-magnetic-pull depth.
- `resonance`: how much the waveform produces lobes and spikelets.
- `viscosity`: damping and smear of motion.
- `lobeCount`: number of dominant field lobes around the blob.
- `reflection`: white reflection strength.
- `accent`: None, Magenta, Amber, Signal Green.
- `spikeThreshold`: when blobby deformation crosses into ferrofluid spikelets.

## Presets

Ship at least four:

- `Aperture Blob`: default, bright circular aperture, single glossy blob, slow
  resonant breathing.
- `Black Stage`: dark hero look with hard white reflections and magenta accent.
- `Magnetic Beads`: main blob plus small satellite droplets reacting to peaks.
- `High Resonance`: stronger field, lobe sharpening, spikelets, closer to the
  classic ferrofluid crown.

## Data Flow

```
SignalHost frame
  -> magnetic field mimic
  -> density/velocity update
  -> blob mask and droplet state
  -> height/displacement field
  -> normal/reflection shader
  -> canvas display
```

Renderers must consume `n`, `bufX`, and `bufY` from the shared Signal Rack
driver. They must not reimplement Signal Rack signal generation.

## Fallbacks and Errors

- If WebGL renderer creation fails, fall back to a 2D canvas preview that draws
  a glossy black blob driven by `n`.
- The badge should clearly show `WebGL ferrofluid` or `CPU fallback`.
- Unsupported GPU features must fail softly into fallback, not blank the demo.
- The demo should avoid network dependencies and should run from
  `python3 -m http.server` like the rest of the suite.

## Acceptance Criteria

- The launcher shows a tenth Ferrofluid module with a live signal thumbnail.
- `demos/ferrofluid/` loads through the shared host.
- The default preset clearly reads as a reflective black blobby ferrofluid mass.
- The signal visibly drives magnetic resonance behavior, not just opacity or
  position.
- At least four presets render and round-trip through copy-link/export/import.
- The existing AE expression button still exports the driving signal expression.
- WebGL failure produces a nonblank 2D fallback.
- The upstream MIT notice is preserved if upstream fluid-solver code is adapted.

## Verification Plan

- Run `node --check` on touched JavaScript files.
- Run `git diff --check`.
- Serve the repo with `python3 -m http.server`.
- Open `/demos/` and `/demos/ferrofluid/`.
- Verify the canvas is nonblank, animated, and responsive to controls.
- Capture screenshots for default and high-resonance presets.
- Verify export/import round trip and external Signal Rack recipe import.

## Non-Goals

- No true 3D mesh in the first implementation.
- No physical magnetohydrodynamics accuracy claim.
- No audio capture or FFT input in the first implementation.
- No native Dawn or AE plugin proof in this slice.
- No broad refactor of the demo host.

## Open Follow-Up

After the first browser demo lands, decide whether to port the renderer to
WebGPU/WGSL for closer alignment with Signal Rack's native runway.
