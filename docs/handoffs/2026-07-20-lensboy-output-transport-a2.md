# Signal Rack Output A transport — Lensboy Packet A2

Date: 2026-07-20

Baseline: `9423dad32704b2dad2574f6ebaae0516738f2a67`

Status: Signal Rack publishing half implemented and host-free verified

## Scope

Signal Rack now owns a narrow AE publication contract for the pinned
`sg_support_idle_001@0.3` Output A used by Lensboy. It provides:

- stable recipe, output, effect, and parameter identities;
- a generated memoryless AE expression for Output A;
- the ordinary one-line pick-whip reference to that output;
- a deterministic arbitrary-time reference evaluator;
- a dense frame-center bake plan using the existing bake-keyframe contract;
- explicit preservation/loss reports for expression and bake transports.

The live courier is not used. The generated expression is a bounded publication
of the S1 memoryless recipe, not a second portable preset or canonical engine.
The source recipe remains canonical, and the test pins expression constants and
evaluation behavior to that recipe.

Expression transport preserves stable source identity, normalized profile, and
memoryless arbitrary-time behavior, while reporting that it does not execute
the WGSL path. Bake additionally preserves exact frame-center values, while
reporting loss of the live source link and continuous between-frame evaluation.

## Verification

`ae_output_transport_test` proves:

- exact stable identity and escaped one-line output references;
- no `sampleImage`/courier dependency;
- 4,096 samples are byte-consistent under permuted frame order;
- the output remains in the S1 `0.41..0.59` band;
- 240 dense bake keys match live evaluation within `1e-6`;
- invalid bake cadence refuses to emit keys;
- preservation/loss reports distinguish expression from bake.

The full host-free Signal Rack CTest lane must remain green before this commit is
published. No After Effects installation or launch is part of this packet.

## Consumer boundary

Lensboy may consume this public header to build its typed support-opacity
binding. Lensboy remains responsible for destination mapping, fallback,
project-state persistence, and proving that no geometry axis is driven.
