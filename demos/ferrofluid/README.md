# Ferrofluid

Signal Rack behaves like a magnetic resonance driver: the waveform becomes a
synthetic magnetic field that pulls a glossy black 2.5D ferrofluid blob into
lobes, dimples, beads, and high-energy spikelets.

The default preset is the blobby aperture look. Dark and high-resonance presets
push toward reflective macro ferrofluid, but this demo does not claim physical
magnetohydrodynamics accuracy.

## Signal Mapping

- `n` controls overall magnetic pull and breathing.
- `bufX` shapes angular lobe pressure around the blob.
- `bufY` adds secondary wobble and bead variation when the combine mode uses it.

## Run

From the repo root:

```bash
python3 -m http.server
# open http://localhost:8000/demos/ferrofluid/
```
