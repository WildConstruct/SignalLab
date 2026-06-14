// =============================================================================
//  signalrack/signal_dawn_bridge.h
//  Public Dawn bridge entrypoint — the "exposed system via the Dawn bridge".
//
//  Mirrors the Etheros shape: a public bridge header that takes a request
//  contract + a wgpu::Device and produces results, while keeping runtime
//  internals (pipelines, buffers) out of the public surface.
//
//  WebGPU/Dawn is the only supported backend. There is no CPU fallback; if the
//  device/path is unavailable the call fails loudly (returns false + message).
// =============================================================================
#ifndef SIGNALRACK_SIGNAL_DAWN_BRIDGE_H
#define SIGNALRACK_SIGNAL_DAWN_BRIDGE_H

#include <dawn/webgpu_cpp.h>

#include <cstdint>
#include <string>

#include "signalrack/signal_output.h"
#include "signalrack/signal_recipe.h"

namespace ItsAllNoise {
namespace SignalRack {

// What the host asks the engine to evaluate. The host has already resolved any
// sidechain Input A to a single scalar, and (for LumaProbe) supplied per-sample
// luma in `lumaSamples` (size must equal sampleCount).
struct SignalRenderRequest {
    SignalRecipe recipe;

    float    startTime    = 0.0f;     // comp seconds of sample 0
    float    dt           = 1.0f / 30.0f;  // seconds between samples
    float    frameDuration= 1.0f / 30.0f;  // for trigger edge detection
    uint32_t sampleCount  = 1;        // 1 = current frame; N = scope window

    float        resolvedInputA = 0.0f;  // sidechain scalar for SourceType::Linked
    const float* lumaSamples    = nullptr;  // length == sampleCount, for LumaProbe
    const float* modSamples     = nullptr;  // length == sampleCount, per-sample modulator
};

// Evaluate the recipe on the GPU and fill `out` with interpreted scalar
// outputs. Returns false and sets *message on failure (no silent fallback).
//
// `device` is owned by the host (the AE plugin's WebGpuBackend, or a tool's
// Dawn-native device). The bridge owns only transient encoders/buffers unless
// a persistent SignalRuntime is provided by the caller.
bool RenderSignalWithDawn(const SignalRenderRequest& request,
                          wgpu::Device&              device,
                          SignalOutputs*             out,
                          std::string*               message);

}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_SIGNAL_DAWN_BRIDGE_H
