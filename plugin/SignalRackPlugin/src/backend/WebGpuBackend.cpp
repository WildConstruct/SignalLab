// =============================================================================
//  WebGpuBackend.cpp  (SignalRackPlugin)
//  Dawn device ownership for the AE plugin. Gated behind SIGNALRACK_HAS_DAWN.
//  When the macro is off (no Dawn tree configured), every entry fails loudly
//  with a clear message — by design there is no CPU path.
//  NOT YET BUILDABLE end-to-end: requires a Dawn tree (IAN_DAWN_SOURCE_DIR).
// =============================================================================
#include "backend/WebGpuBackend.h"

#if defined(SIGNALRACK_HAS_DAWN)
#include <dawn/dawn_proc.h>
#include <dawn/native/DawnNative.h>
#include <dawn/webgpu_cpp.h>

#include "runtime/dawn/signal_runtime.h"
#endif

namespace ItsAllNoise {
namespace SignalRack {
namespace plugin {

#if defined(SIGNALRACK_HAS_DAWN)
struct WebGpuBackend::Impl {
    dawn::native::Instance nativeInstance;
    wgpu::Device           device;
    SignalRuntime          runtime;
};
#else
struct WebGpuBackend::Impl {};
#endif

bool WebGpuBackend::EnsureReady(std::string* message) {
    if (ready_) return true;
#if defined(SIGNALRACK_HAS_DAWN)
    if (!impl_) impl_ = new Impl();
    if (!impl_->device) {
        dawnProcSetProcs(&dawn::native::GetProcs());
        wgpu::Instance instance(impl_->nativeInstance.Get());
        wgpu::RequestAdapterOptions opts{};
        wgpu::Adapter adapter;
        instance.RequestAdapter(
            &opts, wgpu::CallbackMode::WaitAnyOnly,
            [&](wgpu::RequestAdapterStatus, wgpu::Adapter a, wgpu::StringView) { adapter = a; });
        if (!adapter) { if (message) *message = "No WebGPU adapter (Dawn)"; return false; }
        adapter.RequestDevice(
            nullptr, wgpu::CallbackMode::WaitAnyOnly,
            [&](wgpu::RequestDeviceStatus, wgpu::Device d, wgpu::StringView) { impl_->device = d; });
        if (!impl_->device) { if (message) *message = "Failed to create Dawn device"; return false; }
    }
    if (!impl_->runtime.ready() && !impl_->runtime.Initialize(impl_->device, message)) return false;
    ready_ = true;
    return true;
#else
    if (message) {
        *message = "SignalRack built without Dawn (SIGNALRACK_HAS_DAWN off). "
                   "WebGPU/Dawn is the only supported backend; configure IAN_DAWN_SOURCE_DIR.";
    }
    return false;
#endif
}

void WebGpuBackend::WarmUpAsync() {
#if defined(SIGNALRACK_HAS_DAWN)
    // TODO: dispatch EnsureReady() on a worker thread so the first AE render
    // does not stall on adapter/device creation (mirrors Etheros warm-up).
    std::string ignored;
    EnsureReady(&ignored);
#endif
}

bool WebGpuBackend::Evaluate(const PluginRenderRequest& req, SignalOutputs* out, std::string* message) {
    if (!EnsureReady(message)) return false;
#if defined(SIGNALRACK_HAS_DAWN)
    const CompiledSignalConfig cfg =
        Compile(req.recipe, req.startTime, req.dt, req.frameDuration,
                req.sampleCount, req.resolvedInputA);
    return impl_->runtime.Evaluate(impl_->device, cfg, req.sampleCount,
                                   req.lumaSamples, req.startTime, req.dt, out, message);
#else
    (void)req; (void)out;
    return false;  // EnsureReady already set the message
#endif
}

void WebGpuBackend::GetDebugInfo(char* buffer, unsigned long bufferSize) const {
    if (!buffer || bufferSize == 0) return;
#if defined(SIGNALRACK_HAS_DAWN)
    const char* msg = ready_ ? "SignalRack: Dawn backend ready" : "SignalRack: Dawn backend not ready";
#else
    const char* msg = "SignalRack: built without Dawn";
#endif
    unsigned long i = 0;
    for (; msg[i] != '\0' && i + 1 < bufferSize; ++i) buffer[i] = msg[i];
    buffer[i] = '\0';
}

}  // namespace plugin
}  // namespace SignalRack
}  // namespace ItsAllNoise
