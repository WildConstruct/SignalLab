# Signal Output Tests

Two layers of testing: **engine logic** (runnable now) and **AE integration**
(manual, needs the plugin).

## A. Engine logic — RUNNABLE NOW
```
cd prototypes/webgpu-lab && node validate.js     # CPU reference parity oracle
g++ -std=c++17 -I ../../include -I ../.. ../../examples/core_contract_test.cpp -o /tmp/t && /tmp/t
```
`validate.js` asserts (all passing, 10/10):
1. Output A varies over time
2. Percentage output stays in range
3. Determinism for equal seed
4. Different seed ⇒ different signal
5. Signed output spans ~[-1,1]
6. Gate is strictly 0/1
7. Trigger fires sometimes, not always
8. Chained Rack B reflects Rack A
9. Smoothing lowers variance
10. Luma probe drives output in [0,1]

`core_contract_test.cpp` asserts Recipe→Moniker, Recipe→CompiledConfig WGSL
parity (24 floats, correct field positions), AE params→Recipe, sample contract.

## B. WebGPU engine — RUNNABLE in a browser
Open `prototypes/webgpu-lab/index.html` over `http://` (WebGPU needs a secure
context; `python3 -m http.server` works). Confirms the **actual WGSL** dispatches
and the two-rack chain animates. Acceptance: Output A varies; B/C use different
profiles; C reads GATE; Rack B reflects Rack A.

## C. AE integration — MANUAL (needs plugin) [not yet runnable]
| Check | Pass when |
|---|---|
| Output A animates | scrubbing the timeline changes Output A's value |
| Pick-whip works | a property pick-whipped to Output A follows it |
| B different profile | Output B shows degrees/percent per its profile |
| C gate/trigger | Output C is 0/1 (gate) or pulses (trigger) |
| Readable | the pick-whip expression is one line, no math |
