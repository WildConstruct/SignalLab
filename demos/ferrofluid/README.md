# Ferrofluid

Signal Rack behaves like a magnetic resonance driver: the waveform becomes a
synthetic magnetic field that pushes through a small 2D fluid/height solver.
The rendered surface is a glossy black displacement field shaded from the
solver's height and normal data.

The demo is an art-directed fluid approximation rather than a full
magnetohydrodynamics model, but the visible motion is carried by solver state:
velocity advection, pressure projection, and signal-driven height displacement.

## Signal Mapping

- `n` controls overall magnetic pull and height displacement.
- `bufX` pushes angular pressure through the velocity field.
- `bufY` adds secondary field drift and rotational energy when the combine mode uses it.

## Run

From the repo root:

```bash
python3 -m http.server
# open http://localhost:8000/demos/ferrofluid/
```
