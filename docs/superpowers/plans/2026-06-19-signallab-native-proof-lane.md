# Signal Rack Native Proof Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Signal Rack V1 native roadmap into an executable proof ladder: host-free C++ contract checks, explicit Dawn runtime gating, bake/live-courier contracts, and a documented path to the real AE one-rack-to-one-property proof.

**Architecture:** Separate the native proof into three layers. The host-free contract layer must build on machines without Dawn or the AE SDK. The Dawn layer must fail loudly unless a real Dawn tree is supplied. The AE layer starts with pure bake/courier contracts that can be tested outside AE, then names the exact in-app proof that remains external-SDK gated.

**Tech Stack:** CMake 3.21, C++17, Dawn/WebGPU, PowerShell, Node.js, Adobe After Effects SDK.

---

## Scope Check

This plan covers the **Signal Rack V1 native proof lane**. It does not implement
the buyer-facing demo polish lane (`field-distort` image import, gallery proof
route, maturity badges). Those are valuable, but they should follow the native
proof so demo language can point at real engine status.

## File Structure

- Modify: `CMakeLists.txt`
  - Add host-free C++ contract targets.
  - Add an explicit `IAN_BUILD_SIGNALRACK_DAWN_RUNTIME` gate.
  - Fail at configure time when Dawn runtime is requested without Dawn.
- Modify: `plugin/SignalRackPlugin/CMakeLists.txt`
  - Skip the plugin target unless both `AE_SDK` and the Dawn runtime target are
    present.
- Create: `scripts/verify-native-contract.ps1`
  - Runs Node parity checks, configures CMake without Dawn, builds C++ contract
    tests, and runs `ctest`.
- Create: `scripts/verify-dawn-runtime.ps1`
  - Requires a Dawn source path, configures the Dawn runtime target, builds
    `signal_smoke`, and runs it.
- Create: `include/signalrack/ae_bake_contract.h`
  - Converts `SignalOutputs` into deterministic keyframe plans for Output A/B/C.
- Create: `examples/ae_bake_contract_test.cpp`
  - Tests the bake keyframe time/value contract without AE.
- Create: `include/signalrack/live_courier_strip.h`
  - Converts one `SignalSample` plus output channel ranges into the 3x1
    value-strip normalized payload.
- Create: `examples/live_courier_strip_test.cpp`
  - Tests value-strip column packing and decoding against the existing 24-bit
    codec.
- Modify: `.github/workflows/ci.yml`
  - Add the new C++ host-free contract tests to CI.
- Create: `docs/native-proof-runbook.md`
  - Captures how to run host-free, Dawn, and AE proof gates.
- Modify: `docs/engine-roadmap.md`
  - Mark the new proof ladder as the current next lane.
- Create: `docs/notion-build-log/YYYY-MM-DD-native-proof-lane.md`
  - Local Notion-style build entry for the landing packet.

---

### Task 1: CMake Proof Ladder

**Files:**
- Modify: `CMakeLists.txt`
- Modify: `plugin/SignalRackPlugin/CMakeLists.txt`

- [ ] **Step 1: Add CMake options and contract test targets**

In `CMakeLists.txt`, add this near the existing options:

```cmake
option(IAN_BUILD_SIGNALRACK_DAWN_RUNTIME "Build the Dawn-backed Signal Rack runtime and signal_smoke" OFF)
```

Then keep `signalrack_core` available unconditionally and add host-free tests:

```cmake
include(CTest)

add_executable(core_contract_test examples/core_contract_test.cpp)
target_link_libraries(core_contract_test PRIVATE signalrack_core)
add_test(NAME core_contract_test COMMAND core_contract_test)

add_executable(value_codec_test examples/value_codec_test.cpp)
target_link_libraries(value_codec_test PRIVATE signalrack_core)
add_test(NAME value_codec_test COMMAND value_codec_test)
```

- [ ] **Step 2: Gate the Dawn runtime target**

Wrap the existing `signalrack_runtime` and `signal_smoke` block in:

```cmake
if(IAN_BUILD_SIGNALRACK_DAWN_RUNTIME)
    if(NOT IAN_DAWN_SOURCE_DIR AND NOT IAN_USE_EXTERNAL_DAWN)
        message(FATAL_ERROR
            "IAN_BUILD_SIGNALRACK_DAWN_RUNTIME=ON requires IAN_DAWN_SOURCE_DIR "
            "or IAN_USE_EXTERNAL_DAWN=ON. Signal Rack native runtime has no CPU fallback.")
    endif()

    add_library(signalrack_runtime STATIC
        runtime/dawn/signal_runtime.cpp
        runtime/dawn/signal_dawn_bridge.cpp
        "${_wgsl_hdr}")
    target_include_directories(signalrack_runtime PUBLIC
        "${CMAKE_CURRENT_SOURCE_DIR}/include"
        "${CMAKE_CURRENT_SOURCE_DIR}"
        "${_gen_dir}")
    target_link_libraries(signalrack_runtime PUBLIC signalrack_core)

    if(IAN_DAWN_SOURCE_DIR)
        message(STATUS "SignalRack: using Dawn source tree at ${IAN_DAWN_SOURCE_DIR}")
        add_subdirectory("${IAN_DAWN_SOURCE_DIR}" "${CMAKE_BINARY_DIR}/dawn" EXCLUDE_FROM_ALL)
        target_link_libraries(signalrack_runtime PUBLIC dawn::webgpu_dawn)
    elseif(IAN_USE_EXTERNAL_DAWN)
        find_package(Dawn REQUIRED)
        target_link_libraries(signalrack_runtime PUBLIC dawn::webgpu_dawn)
    endif()

    add_executable(signal_smoke examples/signal_smoke.cpp)
    target_link_libraries(signal_smoke PRIVATE signalrack_runtime)
    add_test(NAME signal_smoke COMMAND signal_smoke)
else()
    message(STATUS
        "SignalRack: skipping Dawn runtime. Set IAN_BUILD_SIGNALRACK_DAWN_RUNTIME=ON "
        "with IAN_DAWN_SOURCE_DIR or IAN_USE_EXTERNAL_DAWN to build signal_smoke.")
endif()
```

- [ ] **Step 3: Make the AE plugin target skip cleanly without runtime**

In `plugin/SignalRackPlugin/CMakeLists.txt`, after the `AE_SDK` guard, add:

```cmake
if(NOT TARGET signalrack_runtime)
    message(STATUS "SignalRackPlugin: signalrack_runtime target not present - skipping plugin target.")
    return()
endif()
```

- [ ] **Step 4: Configure without Dawn**

Run:

```powershell
cmake -S . -B build-native-contract -DIAN_BUILD_SIGNALRACK_DAWN_RUNTIME=OFF
```

Expected:

```text
SignalRack: skipping Dawn runtime.
SignalRackPlugin: AE_SDK not set
Configuring done
```

- [ ] **Step 5: Build and run host-free C++ tests**

Run:

```powershell
cmake --build build-native-contract --target core_contract_test value_codec_test
ctest --test-dir build-native-contract --output-on-failure
```

Expected:

```text
100% tests passed
```

- [ ] **Step 6: Commit**

```powershell
git add CMakeLists.txt plugin/SignalRackPlugin/CMakeLists.txt
git commit -m "build: add native contract proof ladder"
```

---

### Task 2: Local Verification Scripts

**Files:**
- Create: `scripts/verify-native-contract.ps1`
- Create: `scripts/verify-dawn-runtime.ps1`

- [ ] **Step 1: Create `scripts/verify-native-contract.ps1`**

```powershell
param(
  [string]$BuildDir = "build-native-contract"
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Push-Location $repo
try {
  node prototypes\webgpu-lab\validate.js
  node prototypes\webgpu-lab\codec-validate.js

  cmake -S . -B $BuildDir -DIAN_BUILD_SIGNALRACK_DAWN_RUNTIME=OFF
  cmake --build $BuildDir --target core_contract_test value_codec_test ae_bake_contract_test live_courier_strip_test
  ctest --test-dir $BuildDir --output-on-failure
} finally {
  Pop-Location
}
```

- [ ] **Step 2: Create `scripts/verify-dawn-runtime.ps1`**

```powershell
param(
  [Parameter(Mandatory = $true)]
  [string]$DawnSourceDir,
  [string]$BuildDir = "build-dawn-runtime"
)

$ErrorActionPreference = "Stop"
if (!(Test-Path -LiteralPath $DawnSourceDir)) {
  throw "DawnSourceDir does not exist: $DawnSourceDir"
}

$repo = Split-Path -Parent $PSScriptRoot
Push-Location $repo
try {
  cmake -S . -B $BuildDir `
    -DIAN_BUILD_SIGNALRACK_DAWN_RUNTIME=ON `
    -DIAN_DAWN_SOURCE_DIR="$DawnSourceDir"
  cmake --build $BuildDir --target signal_smoke

  $exe = Get-ChildItem -Path $BuildDir -Recurse -Filter signal_smoke.exe |
    Select-Object -First 1
  if (!$exe) {
    throw "signal_smoke.exe was not produced under $BuildDir"
  }
  & $exe.FullName
} finally {
  Pop-Location
}
```

- [ ] **Step 3: Run the host-free script**

Run:

```powershell
.\scripts\verify-native-contract.ps1
```

Expected:

```text
30 passed, 0 failed
8 passed, 0 failed
100% tests passed
```

- [ ] **Step 4: Run the Dawn script without a real path to verify the guard**

Run:

```powershell
.\scripts\verify-dawn-runtime.ps1 -DawnSourceDir C:\does-not-exist
```

Expected:

```text
DawnSourceDir does not exist: C:\does-not-exist
```

- [ ] **Step 5: Commit**

```powershell
git add scripts/verify-native-contract.ps1 scripts/verify-dawn-runtime.ps1
git commit -m "test: add native proof verification scripts"
```

---

### Task 3: AE Bake Contract

**Files:**
- Create: `include/signalrack/ae_bake_contract.h`
- Create: `examples/ae_bake_contract_test.cpp`
- Modify: `CMakeLists.txt`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `include/signalrack/ae_bake_contract.h`**

```cpp
#ifndef SIGNALRACK_AE_BAKE_CONTRACT_H
#define SIGNALRACK_AE_BAKE_CONTRACT_H

#include <cstddef>
#include <vector>

#include "signalrack/signal_output.h"

namespace ItsAllNoise {
namespace SignalRack {
namespace ae {

enum class OutputSlot {
    A,
    B,
    C,
};

struct BakeKeyframe {
    float time = 0.0f;
    float value = 0.0f;
};

inline float SelectOutput(const SignalSample& sample, OutputSlot slot) {
    switch (slot) {
        case OutputSlot::A: return sample.a;
        case OutputSlot::B: return sample.b;
        case OutputSlot::C: return sample.c;
    }
    return sample.a;
}

inline std::vector<BakeKeyframe> BuildBakeKeyframes(const SignalOutputs& outputs,
                                                     OutputSlot slot) {
    std::vector<BakeKeyframe> keys;
    keys.reserve(outputs.samples.size());
    for (std::size_t i = 0; i < outputs.samples.size(); ++i) {
        keys.push_back(BakeKeyframe{
            outputs.startTime + static_cast<float>(i) * outputs.dt,
            SelectOutput(outputs.samples[i], slot),
        });
    }
    return keys;
}

}  // namespace ae
}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_AE_BAKE_CONTRACT_H
```

- [ ] **Step 2: Create `examples/ae_bake_contract_test.cpp`**

```cpp
#include "signalrack/ae_bake_contract.h"

#include <cassert>
#include <cstdio>

using namespace ItsAllNoise::SignalRack;

int main() {
    SignalOutputs outputs;
    outputs.startTime = 1.0f;
    outputs.dt = 0.5f;
    outputs.samples.push_back({0.1f, 90.0f, -5.0f, 0.0f});
    outputs.samples.push_back({0.5f, 100.0f, 0.0f, 1.0f});
    outputs.samples.push_back({0.9f, 110.0f, 5.0f, 0.0f});

    const auto a = ae::BuildBakeKeyframes(outputs, ae::OutputSlot::A);
    assert(a.size() == 3);
    assert(a[0].time == 1.0f);
    assert(a[1].time == 1.5f);
    assert(a[2].time == 2.0f);
    assert(a[0].value == 90.0f);
    assert(a[1].value == 100.0f);
    assert(a[2].value == 110.0f);

    const auto c = ae::BuildBakeKeyframes(outputs, ae::OutputSlot::C);
    assert(c[0].value == 0.0f);
    assert(c[1].value == 1.0f);
    assert(c[2].value == 0.0f);

    SignalOutputs empty;
    const auto none = ae::BuildBakeKeyframes(empty, ae::OutputSlot::A);
    assert(none.empty());

    std::printf("AE bake contract OK: %zu Output A keyframes\n", a.size());
    return 0;
}
```

- [ ] **Step 3: Add the test target**

In `CMakeLists.txt` beside the other host-free tests:

```cmake
add_executable(ae_bake_contract_test examples/ae_bake_contract_test.cpp)
target_link_libraries(ae_bake_contract_test PRIVATE signalrack_core)
add_test(NAME ae_bake_contract_test COMMAND ae_bake_contract_test)
```

- [ ] **Step 4: Add CI coverage**

In `.github/workflows/ci.yml`, add:

```yaml
      - name: AE bake contract (C++)
        run: |
          g++ -std=c++17 -I include examples/ae_bake_contract_test.cpp -o ae_bake_contract_test
          ./ae_bake_contract_test
```

- [ ] **Step 5: Run the contract script**

Run:

```powershell
.\scripts\verify-native-contract.ps1
```

Expected:

```text
AE bake contract OK: 3 Output A keyframes
100% tests passed
```

- [ ] **Step 6: Commit**

```powershell
git add include/signalrack/ae_bake_contract.h examples/ae_bake_contract_test.cpp CMakeLists.txt .github/workflows/ci.yml
git commit -m "feat: add AE bake output contract"
```

---

### Task 4: Live Courier Strip Contract

**Files:**
- Create: `include/signalrack/live_courier_strip.h`
- Create: `examples/live_courier_strip_test.cpp`
- Modify: `CMakeLists.txt`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `include/signalrack/live_courier_strip.h`**

```cpp
#ifndef SIGNALRACK_LIVE_COURIER_STRIP_H
#define SIGNALRACK_LIVE_COURIER_STRIP_H

#include <array>
#include <cstdint>

#include "signalrack/signal_output.h"
#include "signalrack/signal_recipe.h"
#include "signalrack/value_codec.h"

namespace ItsAllNoise {
namespace SignalRack {

struct CourierPixel {
    std::uint8_t r = 0;
    std::uint8_t g = 0;
    std::uint8_t b = 0;
};

struct CourierStrip3 {
    CourierPixel a;
    CourierPixel b;
    CourierPixel c;
};

inline CourierPixel PackCourierValue(float value, const OutputChannel& channel) {
    const std::array<std::uint8_t, 3> packed =
        Pack24(NormalizeForStrip(value, channel.min, channel.max));
    return CourierPixel{packed[0], packed[1], packed[2]};
}

inline CourierStrip3 BuildCourierStrip3(const SignalSample& sample,
                                        const OutputChannel& outputA,
                                        const OutputChannel& outputB,
                                        const OutputChannel& outputC) {
    return CourierStrip3{
        PackCourierValue(sample.a, outputA),
        PackCourierValue(sample.b, outputB),
        PackCourierValue(sample.c, outputC),
    };
}

inline float DecodeCourierPixel(const CourierPixel& pixel) {
    return Unpack24(pixel.r, pixel.g, pixel.b);
}

}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_LIVE_COURIER_STRIP_H
```

- [ ] **Step 2: Create `examples/live_courier_strip_test.cpp`**

```cpp
#include "signalrack/live_courier_strip.h"

#include <cassert>
#include <cmath>
#include <cstdio>

using namespace ItsAllNoise::SignalRack;

int main() {
    OutputChannel a{"Scale Pulse", OutputMode::Percentage, 90.0f, 110.0f, "percent", "percentage"};
    OutputChannel b{"Glow", OutputMode::Normalized, 0.0f, 1.0f, "none", "normalized_0_1"};
    OutputChannel c{"Gate", OutputMode::Gate, 0.0f, 1.0f, "none", "gate"};

    SignalSample sample;
    sample.a = 105.0f;
    sample.b = 0.25f;
    sample.c = 1.0f;

    const CourierStrip3 strip = BuildCourierStrip3(sample, a, b, c);
    const float decodedA = DecodeCourierPixel(strip.a);
    const float decodedB = DecodeCourierPixel(strip.b);
    const float decodedC = DecodeCourierPixel(strip.c);

    assert(std::fabs(decodedA - 0.75f) < 1e-6f);
    assert(std::fabs(decodedB - 0.25f) < 1e-6f);
    assert(std::fabs(decodedC - 1.0f) < 1e-6f);

    std::printf("live courier strip OK: A=%.6f B=%.6f C=%.6f\n", decodedA, decodedB, decodedC);
    return 0;
}
```

- [ ] **Step 3: Add the test target**

In `CMakeLists.txt` beside the other host-free tests:

```cmake
add_executable(live_courier_strip_test examples/live_courier_strip_test.cpp)
target_link_libraries(live_courier_strip_test PRIVATE signalrack_core)
add_test(NAME live_courier_strip_test COMMAND live_courier_strip_test)
```

- [ ] **Step 4: Add CI coverage**

In `.github/workflows/ci.yml`, add:

```yaml
      - name: live courier strip contract (C++)
        run: |
          g++ -std=c++17 -I include examples/live_courier_strip_test.cpp -o live_courier_strip_test
          ./live_courier_strip_test
```

- [ ] **Step 5: Run the contract script**

Run:

```powershell
.\scripts\verify-native-contract.ps1
```

Expected:

```text
live courier strip OK: A=0.750000 B=0.250000 C=1.000000
100% tests passed
```

- [ ] **Step 6: Commit**

```powershell
git add include/signalrack/live_courier_strip.h examples/live_courier_strip_test.cpp CMakeLists.txt .github/workflows/ci.yml
git commit -m "feat: add live courier strip contract"
```

---

### Task 5: Native Proof Runbook

**Files:**
- Create: `docs/native-proof-runbook.md`
- Modify: `docs/engine-roadmap.md`

- [ ] **Step 1: Create `docs/native-proof-runbook.md`**

```markdown
# Signal Rack Native Proof Runbook

**Status date:** 2026-06-19

This runbook defines the proof ladder for claiming Signal Rack V1 native
readiness. The host-free contract tier is expected to pass on ordinary developer
machines. The Dawn and After Effects tiers require external SDKs.

## Tier 1: Host-Free Contract Proof

Run:

```powershell
.\scripts\verify-native-contract.ps1
```

Expected:

- JavaScript signal oracle: 30 passed, 0 failed
- JavaScript value codec: 8 passed, 0 failed
- C++ contract tests pass through `ctest`

This tier proves recipe flattening, output contracts, bake keyframe generation,
and live-courier 3x1 strip packing. It does not prove GPU dispatch or AE host
behavior.

## Tier 2: Dawn Runtime Proof

Run:

```powershell
.\scripts\verify-dawn-runtime.ps1 -DawnSourceDir C:\path\to\dawn
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
```

- [ ] **Step 2: Update `docs/engine-roadmap.md`**

Add a short subsection under `Lane 1: Signal Rack V1`:

```markdown
Current implementation order:

1. Host-free native contract proof.
2. Dawn runtime proof.
3. AE bake proof.
4. Live courier proof.
```

- [ ] **Step 3: Commit**

```powershell
git add docs/native-proof-runbook.md docs/engine-roadmap.md
git commit -m "docs: add native proof runbook"
```

---

### Task 6: Notion-Style Landing Log

**Files:**
- Create: `docs/notion-build-log/YYYY-MM-DD-native-proof-lane.md`

- [ ] **Step 1: Create the local log**

Use the current date and final commit range:

```markdown
# YYYY-MM-DD - Native Proof Lane

Target page: Signal Rack - Web Demos (Engineering)
Branch: `claude/signal-lab-product-analysis-8x6oxk`

## Summary

- Added host-free native contract targets and scripts.
- Added AE bake and live-courier value-strip contracts.
- Added Dawn runtime verification script with an explicit no-fallback gate.
- Added native proof runbook and roadmap update.

## Verification

- `.\scripts\verify-native-contract.ps1` -> pass
- `.\scripts\verify-dawn-runtime.ps1 -DawnSourceDir C:\does-not-exist` -> clear prerequisite error

## Remaining External Proof

- Run `verify-dawn-runtime.ps1` against a real Dawn checkout.
- Build the AE plugin against the AE SDK.
- Perform the in-app one-rack-to-one-property bake proof.
```

- [ ] **Step 2: Commit**

```powershell
git add docs/notion-build-log/YYYY-MM-DD-native-proof-lane.md
git commit -m "docs: log native proof lane for Notion"
```

- [ ] **Step 3: Update Notion**

Update the existing Signal Rack engineering page Build Log with a newest-first
entry mirroring the local log:

```text
YYYY-MM-DD - Native proof lane. Added host-free native contract targets/scripts,
AE bake contract, live-courier strip contract, Dawn runtime proof script, and
native proof runbook. Verification: native contract script passed; missing Dawn
path fails with a clear prerequisite error. Remaining external proof: real Dawn
checkout and AE SDK in-app one-property bake.
```

---

### Task 7: Final Verification And Push

**Files:**
- No new files unless verification exposes a defect.

- [ ] **Step 1: Run final host-free verification**

```powershell
.\scripts\verify-native-contract.ps1
```

Expected:

```text
30 passed, 0 failed
8 passed, 0 failed
100% tests passed
```

- [ ] **Step 2: Verify Dawn prerequisite guard**

```powershell
.\scripts\verify-dawn-runtime.ps1 -DawnSourceDir C:\does-not-exist
```

Expected:

```text
DawnSourceDir does not exist: C:\does-not-exist
```

- [ ] **Step 3: Check git status**

```powershell
git status --short --branch
```

Expected:

```text
## claude/signal-lab-product-analysis-8x6oxk...origin/claude/signal-lab-product-analysis-8x6oxk [ahead N]
```

- [ ] **Step 4: Pull and push**

```powershell
git pull --ff-only
git push origin claude/signal-lab-product-analysis-8x6oxk
```

Expected:

```text
Already up to date.
```

and then a successful push range.

## Self-Review

- Spec coverage: The native roadmap items are mapped into host-free contract,
  Dawn runtime, AE bake, live courier, docs, Notion, and push tasks.
- Placeholder scan: No step relies on undefined work; external SDK requirements
  are explicit verification gates.
- Type consistency: The plan uses existing `SignalOutputs`, `SignalSample`,
  `OutputChannel`, and `OutputMode` names from the current repo.
