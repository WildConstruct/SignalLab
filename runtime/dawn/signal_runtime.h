// =============================================================================
//  runtime/dawn/signal_runtime.h
//  Persistent GPU objects for evaluating Signal Rack recipes via Dawn/WebGPU.
//
//  Owns the compute pipeline built from the embedded signal_core.wgsl plus the
//  reusable uniform / storage / readback buffers. A host (AE plugin backend or
//  a tool) creates one SignalRuntime per device and reuses it across frames.
//
//  This is a runtime-internal header — NOT part of the public contract. Public
//  callers use signalrack/signal_dawn_bridge.h instead.
// =============================================================================
#ifndef SIGNALRACK_RUNTIME_DAWN_SIGNAL_RUNTIME_H
#define SIGNALRACK_RUNTIME_DAWN_SIGNAL_RUNTIME_H

#include <dawn/webgpu_cpp.h>

#include <cstdint>
#include <string>

#include "core/signal_runtime_config.h"
#include "signalrack/signal_output.h"

namespace ItsAllNoise {
namespace SignalRack {

class SignalRuntime {
public:
    // Builds the compute pipeline. Returns false (sets *message) if the WGSL
    // module or pipeline fails — no fallback path exists.
    bool Initialize(wgpu::Device& device, std::string* message);

    // Dispatch `cfg` for `sampleCount` samples. `inputSamples` (may be null) is
    // the rack's external input on binding 2 — luma for a LumaProbe, an audio
    // lane for an AudioLane — and its length must equal sampleCount for those
    // sources. `modSamples` / `zSamples` feed bindings 3 / 4. Fills out.
    bool Evaluate(wgpu::Device& device,
                  const CompiledSignalConfig& cfg,
                  std::uint32_t sampleCount,
                  const float* inputSamples,
                  const float* modSamples,
                  const float* zSamples,
                  float startTime, float dt,
                  SignalOutputs* out,
                  std::string* message);

    bool ready() const { return ready_; }

private:
    void EnsureCapacity(wgpu::Device& device, std::uint32_t sampleCount);

    bool                 ready_ = false;
    wgpu::ComputePipeline pipeline_;
    wgpu::Buffer          paramBuf_;   // uniform, 176 bytes (11 vec4 rows)
    wgpu::Buffer          outBuf_;     // storage, vec4 * capacity
    wgpu::Buffer          inputBuf_;   // storage, f32 * capacity (binding 2: luma / audio lane)
    wgpu::Buffer          modBuf_;     // storage, f32 * capacity (sidechain input)
    wgpu::Buffer          zBuf_;       // storage, f32 * capacity (third-signal distort input)
    wgpu::Buffer          readBuf_;    // map-read, vec4 * capacity
    std::uint32_t         capacity_ = 0;
};

}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_RUNTIME_DAWN_SIGNAL_RUNTIME_H
