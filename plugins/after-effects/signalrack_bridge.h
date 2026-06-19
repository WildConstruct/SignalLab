// =============================================================================
//  plugins/after-effects/signalrack_bridge.h
//  AE-facing surface: maps the Signal Rack effect's parameters into a
//  SignalRecipe + render request. Mirrors the Etheros TempBridge pattern (a
//  CPU-testable mapping from host request fields into engine control state),
//  kept free of Dawn so it can be unit-tested without a device.
//
//  The plugin owns the actual AE param stream and a SignalRuntime/device; this
//  header only does the pure translation, which is the fragile part worth
//  testing in isolation.
// =============================================================================
#ifndef SIGNALRACK_PLUGINS_AE_SIGNALRACK_BRIDGE_H
#define SIGNALRACK_PLUGINS_AE_SIGNALRACK_BRIDGE_H

#include <cstdint>

#include "signalrack/signal_recipe.h"

namespace ItsAllNoise {
namespace SignalRack {
namespace ae {

// AE effect parameter order. The three Output sliders are the public values users
// pick-whip FROM after bake or live-courier setup; Render() itself does not
// directly write freshly computed scalar params during AE's evaluation pass.
enum ParamID : std::int32_t {
    kInput = 0,         // AE reserves index 0
    kSourceType,        // popup 1..7
    kRate, kAmount, kPhase, kSeed, kOffset, kSmooth,
    kInputA, kInputB, kInputC,                 // sidechain sliders (pick-whipped INTO)
    kProbePoint, kProbeRadius,                 // luma probe
    kOutAMode, kOutAMin, kOutAMax,
    kOutBMode, kOutBMin, kOutBMax,
    kOutCMode, kOutCMin, kOutCMax,
    kOutputA, kOutputB, kOutputC,              // exposed output sliders (bake/courier)
    kNumParams,
};

// Flat snapshot of param values read from the AE param stream at a time.
struct ParamSnapshot {
    std::uint32_t sourceType = 1;
    float rate = 1, amount = 1, phase = 0, offset = 0, smooth = 0;
    float inputA = 0, inputB = 0, inputC = 0;
    float probeX = 0, probeY = 0, probeRadius = 0.5f;
    std::uint32_t outAMode = 1, outBMode = 4, outCMode = 7;
    float outAMin = 0, outAMax = 1, outBMin = -15, outBMax = 15, outCMin = 0, outCMax = 1;
    std::uint32_t seed = 1;
};

// Pure translation: AE param snapshot -> portable recipe. The resolved Input A
// scalar travels separately in the render request (see signal_dawn_bridge.h).
inline SignalRecipe MapParamsToRecipe(const ParamSnapshot& s, const char* rackId) {
    SignalRecipe r;
    r.id = rackId ? rackId : "sg_ae";
    r.seed = s.seed;
    r.source.type   = static_cast<SourceType>(s.sourceType);
    r.source.rate   = s.rate;
    r.source.amount = s.amount;
    r.source.phase  = s.phase;
    r.source.offset = s.offset;
    r.source.probePoint = { s.probeX, s.probeY };
    r.source.probeRadius = s.probeRadius;
    r.process.smooth = s.smooth;

    r.outputA.mode = static_cast<OutputMode>(s.outAMode);
    r.outputA.min = s.outAMin; r.outputA.max = s.outAMax;
    r.outputB.mode = static_cast<OutputMode>(s.outBMode);
    r.outputB.min = s.outBMin; r.outputB.max = s.outBMax;
    r.outputC.mode = static_cast<OutputMode>(s.outCMode);
    r.outputC.min = s.outCMin; r.outputC.max = s.outCMax;
    return r;
}

}  // namespace ae
}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_PLUGINS_AE_SIGNALRACK_BRIDGE_H
