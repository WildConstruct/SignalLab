# Meters (demo)
Calibrated readouts. Current variants include bar meter + gate, radial gauge,
LED ladder, VU dial, and goniometer. Fill follows the signal through a response
curve, redlines past a threshold, and peak-holds across variants.

`python3 -m http.server` → `/demos/meters/`

- **Structure** — meter type, segments, and variant-specific geometry.
- **Signal** — source/rate/combine/speed.
- **Shaping** — response curve, redline threshold, peak-hold, and goniometer
  channel mapping where selected.
