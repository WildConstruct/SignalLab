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
