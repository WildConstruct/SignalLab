# Signal Rack Native Proof Runbook

**Status date:** 2026-06-19

This runbook defines the proof ladder for claiming Signal Rack V1 native
readiness. The host-free contract tier is expected to pass on developer
machines with a C++17 compiler. The Dawn and After Effects tiers require
external SDKs.

## Tier 1: Host-Free Contract Proof

Run from the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-native-contract.ps1
```

Expected:

- JavaScript signal oracle: 30 passed, 0 failed
- JavaScript value codec: 8 passed, 0 failed
- C++ contract tests pass through `ctest`

Local prerequisites:

- Node.js on `PATH`
- CMake on `PATH`
- One C++17 compiler on `PATH`: `cl.exe`, `g++.exe`, or `clang++.exe`

This tier proves recipe flattening, output contracts, bake keyframe generation,
and live-courier 3x1 strip packing. It does not prove GPU dispatch or AE host
behavior.

## Tier 2: Dawn Runtime Proof

Run from the repo root with a real Dawn checkout:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-dawn-runtime.ps1 -DawnSourceDir C:\path\to\dawn
```

Expected:

- `signalrack_runtime` builds with Dawn.
- `signal_smoke` creates a real `wgpu::Device`.
- `signal_smoke` prints sampled Output A/B/C values.

This tier proves the native runtime path. It must not fall back to CPU.

## Tier 3: After Effects One-Property Proof

Prerequisites:

- Adobe After Effects SDK headers.
- Dawn runtime proof has passed.
- AE plugin target builds into `SignalRackPlugin.aex`.

Manual proof:

1. Apply one Signal Rack effect to one layer.
2. Use a Pulse Driver recipe.
3. Bake Output A over one second at 30 fps.
4. Apply the baked keyframes to one Transform property.
5. Compare the 30 baked values against the Signal Rack CPU reference for the
   same recipe and time window.

Acceptance:

- The target property receives 30 deterministic keyframes.
- Each sampled value is within `1e-4` of the reference.
- The plugin fails loudly if Dawn is unavailable.

## Tier 4: Live Courier Proof

Manual proof:

1. Render the 3x1 value strip for Output A/B/C.
2. Apply the generated `sampleImage` decoder expression.
3. Scrub and play the comp.
4. Verify the expression decodes the same values as `live_courier_strip_test`.
5. Repeat with the required color-management mode.

Acceptance:

- The courier expression survives scrub/playback evaluation order.
- The codec remains within the existing 24-bit tolerance.
- If color management corrupts the strip, the live courier remains marked
  experimental and bake stays the V1 publishing path.

## Current Local Evidence

On this Windows Codex shell, `powershell -ExecutionPolicy Bypass -File
.\scripts\verify-native-contract.ps1` currently reaches the two JavaScript
oracles and then stops at the C++ compiler prerequisite because `cl.exe`,
`g++.exe`, and `clang++.exe` are not on `PATH`.

`powershell -ExecutionPolicy Bypass -File .\scripts\verify-dawn-runtime.ps1
-DawnSourceDir C:\does-not-exist` stops with the expected missing Dawn path
error.
