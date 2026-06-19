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
