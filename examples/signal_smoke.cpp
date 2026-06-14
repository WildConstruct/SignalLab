// =============================================================================
//  examples/signal_smoke.cpp
//  Minimal Dawn-native consumer of the Signal Rack engine. Demonstrates the
//  public flow a host (AE plugin / tool) follows:
//
//     SignalRecipe -> SignalRenderRequest -> RenderSignalWithDawn -> scalars
//
//  Builds a Dawn device, evaluates a Pulse Driver recipe over a 1-second
//  window, and prints the three interpreted scalar outputs. Mirrors the
//  Etheros example smokes (simple_example.cpp / public_consumer_smoke.cpp).
// =============================================================================
#include <dawn/dawn_proc.h>
#include <dawn/native/DawnNative.h>
#include <dawn/webgpu_cpp.h>

#include <cstdio>
#include <string>

#include "core/signal_moniker.h"
#include "signalrack/signal_dawn_bridge.h"

using namespace ItsAllNoise::SignalRack;

static wgpu::Device CreateDevice() {
    static dawn::native::Instance instance;
    dawnProcSetProcs(&dawn::native::GetProcs());
    wgpu::Instance wgpuInstance = wgpu::Instance(instance.Get());

    wgpu::RequestAdapterOptions opts{};
    wgpu::Adapter adapter;
    wgpuInstance.RequestAdapter(
        &opts, wgpu::CallbackMode::WaitAnyOnly,
        [&](wgpu::RequestAdapterStatus, wgpu::Adapter a, wgpu::StringView) { adapter = a; });
    if (!adapter) return {};

    wgpu::Device device;
    adapter.RequestDevice(
        nullptr, wgpu::CallbackMode::WaitAnyOnly,
        [&](wgpu::RequestDeviceStatus, wgpu::Device d, wgpu::StringView) { device = d; });
    return device;
}

int main() {
    wgpu::Device device = CreateDevice();
    if (!device) {
        std::fprintf(stderr, "No WebGPU/Dawn device. This engine has no CPU fallback.\n");
        return 1;
    }

    // Pulse Driver: Output A as Percentage 90..110, B Normalized, C Gate.
    SignalRecipe recipe;
    recipe.id = "sg_pulse_001";
    recipe.name = "Pulse Driver";
    recipe.source.type = SourceType::Pulse;
    recipe.source.rate = 2.0f;
    recipe.outputA = { "Scale Pulse", OutputMode::Percentage, 90.0f, 110.0f, "percent", "percentage" };
    recipe.outputB = { "Glow Drive",  OutputMode::Normalized,  0.0f,   1.0f, "none",    "normalized_0_1" };
    recipe.outputC = { "Beat Gate",   OutputMode::Gate,        0.0f,   1.0f, "none",    "gate" };

    std::printf("Rack: %s\n", SuggestName(recipe).c_str());

    SignalRenderRequest req;
    req.recipe = recipe;
    req.startTime = 0.0f;
    req.dt = 1.0f / 30.0f;
    req.frameDuration = 1.0f / 30.0f;
    req.sampleCount = 30;  // one second @ 30fps

    SignalOutputs out;
    std::string message;
    if (!RenderSignalWithDawn(req, device, &out, &message)) {
        std::fprintf(stderr, "Render failed: %s\n", message.c_str());
        return 1;
    }

    std::printf("frame   norm     A(%%)     B       C\n");
    for (std::size_t i = 0; i < out.samples.size(); i += 5) {
        const SignalSample& s = out.samples[i];
        std::printf("%4zu   %5.3f   %6.2f   %5.3f   %s\n",
                    i, s.normalized, s.a, s.b, (s.c >= 0.5f ? "GATE" : "-"));
    }
    return 0;
}
