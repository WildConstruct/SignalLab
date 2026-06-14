// =============================================================================
//  signalrack/signal_output.h
//  Public contract for the engine's INTERPRETED SCALAR OUTPUTS.
//
//  Per the Etheros "outputs philosophy": the shader path emits several
//  interpreted scalar outputs per sample. Hosts read these scalars and never
//  re-derive the signal. One SignalSample mirrors one vec4 written by
//  shaders/signal_core.wgsl: (normalized, A, B, C).
// =============================================================================
#ifndef SIGNALRACK_SIGNAL_OUTPUT_H
#define SIGNALRACK_SIGNAL_OUTPUT_H

#include <cstdint>
#include <vector>

namespace ItsAllNoise {
namespace SignalRack {

// One evaluated frame/sample of a rack. Matches outBuf[i] in signal_core.wgsl.
struct SignalSample {
    float normalized = 0.0f;   // 0..1 base
    float a = 0.0f;            // Output A (profile-mapped)
    float b = 0.0f;            // Output B
    float c = 0.0f;            // Output C
};

// A contiguous window of evaluated samples (e.g. a scope window, or a single
// frame when size()==1). startTime + i*dt gives each sample's comp time.
struct SignalOutputs {
    float startTime = 0.0f;
    float dt        = 0.0f;
    std::vector<SignalSample> samples;

    // Convenience: the most-recent sample (host's "current frame" read).
    const SignalSample& current() const { return samples.back(); }
    bool empty() const { return samples.empty(); }
};

}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_SIGNAL_OUTPUT_H
