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

    // Dispatch `cfg` for `sampleCount` samples; `lumaSamples` (may be null)
    // length must equal sampleCount when the source is a LumaProbe. Fills out.
    bool Evaluate(wgpu::Device& device,
                  const CompiledSignalConfig& cfg,
                  std::uint32_t sampleCount,
                  const float* lumaSamples,
                  const float* modSamples,
                  float startTime, float dt,
                  SignalOutputs* out,
                  std::string* message);

    bool ready() const { return ready_; }

private:
    void EnsureCapacity(wgpu::Device& device, std::uint32_t sampleCount);

    bool                 ready_ = false;
    wgpu::ComputePipeline pipeline_;
    wgpu::Buffer          paramBuf_;   // uniform, 96 bytes
    wgpu::Buffer          outBuf_;     // storage, vec4 * capacity
    wgpu::Buffer          lumaBuf_;    // storage, f32 * capacity (probe input)
    wgpu::Buffer          modBuf_;     // storage, f32 * capacity (sidechain input)
    wgpu::Buffer          readBuf_;    // map-read, vec4 * capacity
    std::uint32_t         capacity_ = 0;
};

}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_RUNTIME_DAWN_SIGNAL_RUNTIME_H
