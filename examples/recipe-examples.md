# Recipe Examples

First-pass recipes live in `schemas/examples/`. Each validates against
`schemas/signal-rack-recipe.schema.json`. The `.wcx` preset envelope (the
`Recipe → .wcx payload` path) is shown in `wcx-envelope.example.json`.

| # | File | Source | Outputs (A / B / C) | Notes |
|---|---|---|---|---|
| 1 | `01-pulse-driver.json` | Pulse | Scale % / Glow / Beat Gate | the "hello world" rack |
| 2 | `02-unstable-oscillator.json` | Sine+smooth | Drift / Degrees / Pixels | pair with a Walk rack on Input A |
| 3 | `03-needle-bounce.json` | Audio lane (Tympo kick hits) + spring | Overshoot % / Rot° / Settle Gate | real spring: kicks, swings past rest, settles |
| 4 | `04-luma-probe-driver.json` | Luma Probe 5×5 | Norm / Entropy Birth / Gate | analyze-and-cache for prod |
| 5 | `05-audio-transient-placeholder.json` | Audio placeholder | Envelope / Hit% / Trigger | superseded by 5b; kept so old chains parse |
| 5b | `05b-audio-lane.json` | Audio lane (Tympo kick level) | Envelope / Glow% / Kick Gate | real audio analysis as the source |
| 6 | `06-cathode-sync-drift.json` | Random Walk | Sync px / Chroma° / Dropout Gate | Cathode `.wcx` pack |
| 7 | `07-entropy-birth-driver.json` | Linked (luma A) | Birth / Size / Turbulence | WC payload identity set |
| 8 | `08-kinetic-type-gate.json` | Pulse | Reveal / Voltage Gate / Flash Trigger | clock-style type reveals |

## How a recipe becomes motion
```
recipe.json ──parse──► SignalRecipe ──Compile()──► CompiledSignalConfig
            │                                            │
            └──► .wcx envelope (preset share)            └──► signal_core.wgsl dispatch
                                                              └──► Output A/B/C params ──pick-whip──► AE property
```

## Audio lanes (Tympo)
`audioLane` racks read a per-sample external input the host renders from a
Tympo lane (`level` = continuous 0..1 at the publish cadence, `hits` = decaying
kicks). `prototypes/webgpu-lab/tympo-lane.js` does the rendering
(`fromTympo` → `laneToInput` / `levelToInput` / `hitsToInput`); in the web tool,
pick **Audio lane (Tympo)** as Channel X's source and load the export.
```
tympo export ──fromTympo──► lane ──laneToInput(grid)──► extInput (binding 2)
                                                         └──► audioLane rack ──► spring / lag ──► A/B/C
```
With `spring` on, outputs may pass their range by the bounce (see
`docs/known-limitations.md`).

## Wild Construct payload (define-only in v1)
Recipes 4/6/7 carry a `wildConstruct` block (rackId, channels, targetIdentity).
Generic AE never sees it; WC tools (Entropy, Cathode) read it for richer
targeting. Transport beyond `.wcx` metadata is deferred — see the report's open
questions.
