// =============================================================================
//  core/signal_runtime_config.h
//  Recipe -> CompiledSignalConfig (the runtime path's first hop).
//
//  CompiledSignalConfig is the CPU-side mirror of the WGSL `SignalParams`
//  uniform block (24 x f32 == 96 bytes). Compile() flattens a SignalRecipe +
//  request timing into that exact layout. This file is pure, header-only, and
//  unit-testable with no GPU (cf. Etheros "CPU-testable mapping from request
//  fields into control state").
//
//  INVARIANT: kFloatCount and field order MUST stay in lockstep with
//  shaders/signal_core.wgsl struct SignalParams.
// =============================================================================
#ifndef SIGNALRACK_CORE_SIGNAL_RUNTIME_CONFIG_H
#define SIGNALRACK_CORE_SIGNAL_RUNTIME_CONFIG_H

#include <array>
#include <cstdint>

#include "signalrack/signal_recipe.h"

namespace ItsAllNoise {
namespace SignalRack {

struct CompiledSignalConfig {
    // Layout indices into SignalParams. Keep identical to the WGSL struct.
    static constexpr int kFloatCount = 24;
    enum Field {
        SrcType = 0, Rate, Amount, Phase, Seed, Offset, Smooth, InputA,
        StartTime = 8, Dt, FrameDur, SampleN,
        ModeA = 12, MinA, MaxA, PadA,
        ModeB = 16, MinB, MaxB, PadB,
        ModeC = 20, MinC, MaxC, PadC,
    };

    std::array<float, kFloatCount> params{};

    const float* data() const { return params.data(); }
    static constexpr std::uint32_t byteSize() { return kFloatCount * sizeof(float); }
};

// Pure mapping. `resolvedInputA` is the host-resolved sidechain scalar.
inline CompiledSignalConfig Compile(const SignalRecipe& r,
                                    float startTime, float dt, float frameDur,
                                    std::uint32_t sampleCount,
                                    float resolvedInputA) {
    CompiledSignalConfig c{};
    auto& p = c.params;
    p[CompiledSignalConfig::SrcType] = static_cast<float>(r.source.type);
    p[CompiledSignalConfig::Rate]    = r.source.rate;
    p[CompiledSignalConfig::Amount]  = r.source.amount;
    p[CompiledSignalConfig::Phase]   = r.source.phase;
    p[CompiledSignalConfig::Seed]    = static_cast<float>(r.seed);
    p[CompiledSignalConfig::Offset]  = r.source.offset;
    p[CompiledSignalConfig::Smooth]  = r.process.smooth;
    p[CompiledSignalConfig::InputA]  = resolvedInputA;

    p[CompiledSignalConfig::StartTime] = startTime;
    p[CompiledSignalConfig::Dt]        = dt;
    p[CompiledSignalConfig::FrameDur]  = frameDur;
    p[CompiledSignalConfig::SampleN]   = static_cast<float>(sampleCount);

    auto pack = [&](int base, const OutputChannel& ch) {
        p[base + 0] = static_cast<float>(ch.mode);
        p[base + 1] = ch.min;
        p[base + 2] = ch.max;
        p[base + 3] = 0.0f;  // pad
    };
    pack(CompiledSignalConfig::ModeA, r.outputA);
    pack(CompiledSignalConfig::ModeB, r.outputB);
    pack(CompiledSignalConfig::ModeC, r.outputC);
    return c;
}

}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_CORE_SIGNAL_RUNTIME_CONFIG_H
