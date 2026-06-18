# Glitch / Distortion (demo)

The image is the foreground; the **signal is invisible and subtly corrupts it**.
MVP: a procedural NTSC test card with RGB chroma split, horizontal sync jitter,
and scanlines — all driven by the signal. Roadmap (imported images, dropout,
pixel-sort) in `docs/web-demos/glitch-distortion.md`.

```
python3 -m http.server   # then visit /demos/glitch-distortion/
```

## Controls
- **Structure** — *Scanline gap*.
- **Signal** — *Source / Rate / Combine / Speed* (default: random-walk × sine, `max`).
- **Shaping** — *Chroma phase* (RGB split px) and *Sync drift* (sample-and-hold
  horizontal roll). On peaks (`n > 0.78`) a dropout tear band appears.

## How the signal drives it
`n` is the corruption energy: chroma split = `n · chroma`, sync offset =
`(sample-held jitter) · n · drift`. The card is stroked once per channel in pure
R/G/B with `lighter` compositing, so the three passes recombine cleanly when the
signal is quiet and fringe apart as it rises. Param names mirror the Cathode CRT
plugin so a recipe transfers. No signal math in the renderer.
