# Transitions (demo)
Signal-shaped animate-ins. Current variants include loading bar, wipe, radial
fill, and text reveal. The playhead stays monotonic while the signal shapes the
pace through easing and response controls.

`python3 -m http.server` → `/demos/transitions/`

- **Structure** — variant picker plus geometry/text controls where relevant.
- **Signal** — source/rate/combine/speed.
- **Shaping** — signal pace and easing curve: how strongly the driver bends the
  climb without letting it regress.
