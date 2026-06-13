// =============================================================================
//  WebGpuBackend.h  (SignalRackPlugin)
//  Owns the plugin's Dawn/WebGPU device and the persistent SignalRuntime.
//
//  Modeled on the Etheros TempBridge WebGpuBackend: device creation + async
//  warm-up are gated behind SIGNALRACK_HAS_DAWN; WebGPU/Dawn is the only
//  backend, so when it is unavailable the effect reports an error rather than
//  silently falling back. NOT YET BUILDABLE — needs a Dawn tree + AE SDK.
// =============================================================================
#ifndef SIGNALRACK_PLUGIN_WEBGPU_BACKEND_H
#define SIGNALRACK_PLUGIN_WEBGPU_BACKEND_H

#include <string>

#include "signalrack/signal_output.h"
#include "signalrack/signal_recipe.h"

namespace ItsAllNoise {
namespace SignalRack {
namespace plugin {

// A single render request from the effect's Render() call, already lifted out
// of AE param types. `lumaSamples` is non-null only for LumaProbe sources.
struct PluginRenderRequest {
    SignalRecipe recipe;
    float    startTime    = 0.0f;
    float    dt           = 1.0f / 30.0f;
    float    frameDuration= 1.0f / 30.0f;
    std::uint32_t sampleCount = 1;
    float    resolvedInputA = 0.0f;
    const float* lumaSamples = nullptr;
};

class WebGpuBackend {
public:
    // Lazily creates the Dawn device + SignalRuntime. Returns false (sets
    // *message) if WebGPU/Dawn is unavailable. There is no CPU fallback.
    bool EnsureReady(std::string* message);

    // Kick device creation off the render thread so the first frame is not
    // stalled (mirrors Etheros WarmUpWebGpuBackendAsync).
    void WarmUpAsync();

    // Evaluate one request. Fills `out` with interpreted scalar outputs.
    bool Evaluate(const PluginRenderRequest& req, SignalOutputs* out, std::string* message);

    // For the SKELETON_BUILD_INFO param (mirrors GetWebGpuDebugInfo).
    void GetDebugInfo(char* buffer, unsigned long bufferSize) const;

    bool ready() const { return ready_; }

private:
    bool ready_ = false;
    // Opaque impl holds wgpu::Instance/Adapter/Device + SignalRuntime so this
    // header stays free of Dawn includes for fast incremental builds.
    struct Impl;
    Impl* impl_ = nullptr;
};

}  // namespace plugin
}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_PLUGIN_WEBGPU_BACKEND_H
