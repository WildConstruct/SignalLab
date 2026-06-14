# Recipe Examples

Eight first-pass recipes live in `schemas/examples/`. Each validates against
`schemas/signal-rack-recipe.schema.json`. The `.wcx` preset envelope (the
`Recipe → .wcx payload` path) is shown in `wcx-envelope.example.json`.

| # | File | Source | Outputs (A / B / C) | Notes |
|---|---|---|---|---|
| 1 | `01-pulse-driver.json` | Pulse | Scale % / Glow / Beat Gate | the "hello world" rack |
| 2 | `02-unstable-oscillator.json` | Sine+smooth | Drift / Degrees / Pixels | pair with a Walk rack on Input A |
| 3 | `03-needle-bounce.json` | Linked (audio C) | Overshoot % / Rot° / Settle Gate | bake for true spring |
| 4 | `04-luma-probe-driver.json` | Luma Probe 5×5 | Norm / Entropy Birth / Gate | analyze-and-cache for prod |
| 5 | `05-audio-transient-placeholder.json` | Audio placeholder | Envelope / Hit% / Trigger | real audio → Visualizer later |
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

## Wild Construct payload (define-only in v1)
Recipes 4/6/7 carry a `wildConstruct` block (rackId, channels, targetIdentity).
Generic AE never sees it; WC tools (Entropy, Cathode) read it for richer
targeting. Transport beyond `.wcx` metadata is deferred — see the report's open
questions.
