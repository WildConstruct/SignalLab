# Sidechain (Chaining) Tests

Proves one rack output can feed another rack input without a node graph.

## Runnable now
`node prototypes/webgpu-lab/validate.js` → test 8 ("Chained rack B reflects rack
A") asserts `rackB.output("A") / 100 == rackA.output("A")` when Rack B is
`Linked` to Rack A Output A and mapped to Percentage 0..100.

Browser: `prototypes/webgpu-lab/index.html` shows Rack A (generator) → Rack B
(Linked, Input A ⟵ Rack A Output A) with both scopes live. Rack B's percentage
tracks Rack A's normalized signal, smoothed.

## Contract
Sidechain is a **host-resolved scalar**: the host reads the upstream output at
the evaluation time and passes it as `resolvedInputA` in the render request
(`include/signalrack/signal_dawn_bridge.h`). The shader's `Linked` source simply
clamps and forwards Input A. This is why chaining is robust — it's one number,
not a graph.

## AE integration — MANUAL [needs plugin]
| Check | Pass when |
|---|---|
| Rack 1 → Rack 2 | pick-whip Rack 2 Input A to Rack 1 Output A |
| Rack 2 processes | Rack 2 smoothing/mapping changes the shape |
| Rack 2 drives target | a property pick-whipped to Rack 2 Output A moves |
| No graph | the whole chain is just pick-whips |

## Demo chains to verify
1. Audio Transient → Needle Bounce → type Scale
2. Luma Probe → Smooth/Gate → Entropy Birth Driver → birth rate
3. Clock → Divider → Gate → Type Reveal
