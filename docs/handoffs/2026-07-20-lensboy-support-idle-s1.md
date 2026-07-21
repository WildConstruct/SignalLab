# Signal Rack Packet S1 — support-idle recipe handoff

Date: 2026-07-20

Status: **Packet S1 complete; no After Effects or Lensboy geometry integration started**

Signal Rack baseline: `f47d9933cdcaef6819c87bc114463976aff339c1`

Branch: `agent/lensboy-support-idle-s1`

## Isolation and ownership

The active Signal Rack checkout contained a large mixed worktree and 14 local
ferrofluid commits not published to its tracked remote branch. Packet S1 was
therefore implemented in an isolated worktree created from the refreshed remote
tip. None of the active checkout's modified, deleted, untracked, or unpublished
paths were staged, changed, or pushed by this packet.

## Delivered recipe

`schemas/examples/18-lensboy-support-idle.json` adds one portable
`wildconstruct.signalRecipe`:

- stable ID: `sg_support_idle_001`;
- one Output A only; Outputs B and C are intentionally absent;
- scalar `normalized_0_1` output with declared range `[0,1]` and units
  `normalized`;
- continuous, deterministic, memoryless, arbitrary-time semantics;
- a 0.12 Hz sine source with a fixed seed and no smoothing or lag;
- pointwise gain `0.18`, producing an actual normalized envelope of
  approximately `0.41..0.59` without state or frame-order dependence;
- product-neutral destination guidance for support-lane, secondary-annotation,
  and guide-overlay opacity;
- no Lensboy geometry, After Effects layer identity, feedback, trigger state,
  anonymous spare channel, or runtime host binding.

The established `normalized_0_1` profile already exists in Signal Rack recipes
and public contracts, so Packet S1 does not introduce a duplicate output-profile
identity. An easing or tween contract is unnecessary for this memoryless
continuous oscillator; the recipe uses the existing source/process vocabulary
directly.

## Deterministic proof

`scripts/validate-lensboy-support-idle.mjs` is registered as a CTest when Node
is available. It:

- checks the typed semantic metadata and Output-A-only contract;
- evaluates 4,096 times spanning negative and positive arbitrary host time;
- replays the same times forward, reverse, and in a deterministic shuffled
  order using fresh rack instances;
- requires exact equality at each time across evaluation orders;
- compares every sample with the direct WGSL-equivalent sine and pointwise-gain
  formula to `1e-12`;
- proves the actual signal range is `0.41..0.59` while the declared transport
  range remains normalized `[0,1]`.

## Verification

- Draft 7 validation against `schemas/signal-rack-recipe.schema.json`: passed;
- focused S1 validator: 4,096 samples passed;
- existing browser/CPU engine oracle: 30/30 passed;
- existing value-codec oracle: 8/8 passed;
- Release host-free CTest: 5/5 passed:
  - `core_contract_test`;
  - `value_codec_test`;
  - `ae_bake_contract_test`;
  - `live_courier_strip_test`;
  - `lensboy_support_idle_recipe_test`;
- `git diff --check`: clean before commit.

No Dawn runtime, After Effects plugin, live courier, browser UI, or visual taste
claim is made by this host-free recipe packet.

## Next gate

Lensboy Packet L3 may pin this Signal Rack commit and map Output A to the
existing support-lane opacity destination with an explicit destination range,
clamp, response, transport preference, and static fallback. Packet A2 remains
gated on L3 and A1.
