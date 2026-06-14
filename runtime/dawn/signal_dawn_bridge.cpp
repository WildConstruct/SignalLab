// =============================================================================
//  runtime/dawn/signal_dawn_bridge.cpp
//  Implements the public signalrack/signal_dawn_bridge.h entrypoint.
//
//  This is the thin seam between the host's request contract and the runtime.
//  It compiles the recipe to a CompiledSignalConfig and dispatches it. A
//  process-local SignalRuntime is lazily created per device so repeated calls
//  reuse the pipeline/buffers (the AE plugin should instead hold its own
//  SignalRuntime; this convenience path keeps tools/examples simple).
// =============================================================================
#include "signalrack/signal_dawn_bridge.h"

#include "core/signal_runtime_config.h"
#include "runtime/dawn/signal_runtime.h"

namespace ItsAllNoise {
namespace SignalRack {

bool RenderSignalWithDawn(const SignalRenderRequest& request,
                          wgpu::Device&              device,
                          SignalOutputs*             out,
                          std::string*               message) {
    if (out == nullptr) {
        if (message) *message = "out must not be null";
        return false;
    }
    if (request.recipe.source.type == SourceType::LumaProbe &&
        request.lumaSamples == nullptr) {
        if (message) *message = "LumaProbe source requires host-supplied lumaSamples";
        return false;
    }

    // One runtime per device, reused across calls (thread_local keeps it simple
    // for the synchronous AE/tool path; a real host owns its SignalRuntime).
    static thread_local SignalRuntime runtime;
    if (!runtime.ready()) {
        if (!runtime.Initialize(device, message)) return false;
    }

    const CompiledSignalConfig cfg =
        Compile(request.recipe, request.startTime, request.dt,
                request.frameDuration, request.sampleCount, request.resolvedInputA);

    return runtime.Evaluate(device, cfg, request.sampleCount,
                            request.lumaSamples, request.modSamples,
                            request.startTime, request.dt,
                            out, message);
}

}  // namespace SignalRack
}  // namespace ItsAllNoise
