# Demo Plan — Meters

**Positioning:** readout instruments. Bundles naturally with FUI Kit (same
audience) but planned separately so it can ship as a small utility. The signal
drives a *calibrated* readout — the place the 0→100 response curve and redline
gate matter most.

## Variants (port from `drawApplied()` Meter category)
Bar meter + gate (`meter`), Radial gauge (`meterRadial`), LED ladder
(`meterLED`), Stereo bars (`meterStereo`), Histogram (`meterHistogram`), Rotary
dial (`meterDial`).

## Controls
- **Structure:** meter type; segment / LED count; needle/dial range; tick marks.
- **Signal:** built-in driver or external recipe; uses the **Output range** (min→max).
- **Shaping:** fill response curve (linear/ease/gamma); peak-hold + decay;
  redline gate threshold; smoothing.

## MVP (first loop slice)
Bar meter + gate (port `meter`): fill follows `(val−min)/(max−min)` with a
response curve; redline color past 0.85; gate dot keys off `n≥0.5`. One preset.

## Roadmap
1. MVP bar meter + gate. 2. Radial gauge + LED ladder. 3. Stereo + histogram +
dial. 4. Peak-hold + response curve + redline gate as shared controls.
5. Presets + external signal + AE expression.

## Notes
Meters are range-aware (`APP_RANGE`); wire the shared Output-range control here
first, then reuse for Transform mappings in other demos.
