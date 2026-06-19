# Glitch / Distortion (demo)

The image is the foreground; the **signal is invisible and subtly corrupts it**.
Current surface: a procedural NTSC test card with RGB chroma split, horizontal
sync jitter, scanlines, block displacement/datamosh, signal-gated dropout, and
stylized pixel-sort. Imported image/logo input remains the next product proof for
the retro logo-machine lane.

```
python3 -m http.server   # then visit /demos/glitch-distortion/
```

## Controls
- **Structure** — *Scanline gap*, *Block size*, and distortion-card styling.
- **Signal** — *Source / Rate / Combine / Speed* (default: random-walk × sine, `max`).
- **Shaping** — *Chroma phase*, *Sync drift*, *Pixel-sort ≥*, *Sort axis*,
  *Dropout gate*, and response controls.

## How the signal drives it
`n` is the corruption energy: chroma split, sync offset, dropout, block smear,
and pixel-sort all intensify as the signal rises. The card is drawn in channel
passes so it recombines when quiet and fringes apart on peaks. Param names mirror
the Cathode/field-distortion lane so a recipe can transfer.
