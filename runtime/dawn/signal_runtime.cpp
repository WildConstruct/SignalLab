// =============================================================================
//  runtime/dawn/signal_runtime.cpp
//  Dawn dispatch of the canonical signal_core.wgsl compute shader.
//
//  The WGSL is embedded at build time (IAN_EMBED_WGSL) and exposed as
//  kSignalCoreWgsl by the generated signal_core_wgsl.h. The mapping from
//  request -> SignalParams happens in core/Compile(); this file only owns GPU
//  plumbing and the synchronous readback used by the AE single-frame path.
// =============================================================================
#include "runtime/dawn/signal_runtime.h"

#include <cstring>

#include "signal_core_wgsl.h"  // generated: const char* kSignalCoreWgsl

namespace ItsAllNoise {
namespace SignalRack {

namespace {
constexpr std::uint32_t kVec4Bytes = 4 * sizeof(float);

// Block until a Dawn future resolves (single-frame AE path is synchronous).
bool WaitFor(wgpu::Device& device, wgpu::Future future, std::string* message) {
    wgpu::Instance instance = device.GetAdapter().GetInstance();
    wgpu::WaitStatus status =
        instance.WaitAny(future, /*timeoutNS=*/5'000'000'000ull);
    if (status != wgpu::WaitStatus::Success) {
        if (message) *message = "Timed out waiting for Dawn future";
        return false;
    }
    return true;
}
}  // namespace

bool SignalRuntime::Initialize(wgpu::Device& device, std::string* message) {
    wgpu::ShaderSourceWGSL wgslDesc{};
    wgslDesc.code = kSignalCoreWgsl;
    wgpu::ShaderModuleDescriptor moduleDesc{};
    moduleDesc.nextInChain = &wgslDesc;
    wgpu::ShaderModule module = device.CreateShaderModule(&moduleDesc);
    if (!module) {
        if (message) *message = "Failed to create signal_core.wgsl shader module";
        return false;
    }

    wgpu::ComputePipelineDescriptor pipeDesc{};
    pipeDesc.compute.module = module;
    pipeDesc.compute.entryPoint = "main";
    pipeline_ = device.CreateComputePipeline(&pipeDesc);
    if (!pipeline_) {
        if (message) *message = "Failed to create signal compute pipeline";
        return false;
    }

    wgpu::BufferDescriptor ubo{};
    ubo.size = CompiledSignalConfig::byteSize();
    ubo.usage = wgpu::BufferUsage::Uniform | wgpu::BufferUsage::CopyDst;
    paramBuf_ = device.CreateBuffer(&ubo);

    ready_ = true;
    return true;
}

void SignalRuntime::EnsureCapacity(wgpu::Device& device, std::uint32_t sampleCount) {
    if (sampleCount <= capacity_) return;
    capacity_ = sampleCount;

    wgpu::BufferDescriptor sb{};
    sb.size = static_cast<std::uint64_t>(capacity_) * kVec4Bytes;
    sb.usage = wgpu::BufferUsage::Storage | wgpu::BufferUsage::CopySrc;
    outBuf_ = device.CreateBuffer(&sb);

    wgpu::BufferDescriptor lb{};
    lb.size = static_cast<std::uint64_t>(capacity_) * sizeof(float);
    lb.usage = wgpu::BufferUsage::Storage | wgpu::BufferUsage::CopyDst;
    lumaBuf_ = device.CreateBuffer(&lb);
    modBuf_ = device.CreateBuffer(&lb);  // same shape (f32 * capacity)
    zBuf_ = device.CreateBuffer(&lb);

    wgpu::BufferDescriptor rb{};
    rb.size = static_cast<std::uint64_t>(capacity_) * kVec4Bytes;
    rb.usage = wgpu::BufferUsage::MapRead | wgpu::BufferUsage::CopyDst;
    readBuf_ = device.CreateBuffer(&rb);
}

bool SignalRuntime::Evaluate(wgpu::Device& device,
                             const CompiledSignalConfig& cfg,
                             std::uint32_t sampleCount,
                             const float* lumaSamples,
                             const float* modSamples,
                             const float* zSamples,
                             float startTime, float dt,
                             SignalOutputs* out,
                             std::string* message) {
    if (!ready_) { if (message) *message = "SignalRuntime not initialized"; return false; }
    if (sampleCount == 0) { if (message) *message = "sampleCount must be >= 1"; return false; }
    EnsureCapacity(device, sampleCount);

    device.GetQueue().WriteBuffer(paramBuf_, 0, cfg.data(), CompiledSignalConfig::byteSize());
    if (lumaSamples) {
        device.GetQueue().WriteBuffer(lumaBuf_, 0, lumaSamples, sampleCount * sizeof(float));
    }
    if (modSamples) {
        device.GetQueue().WriteBuffer(modBuf_, 0, modSamples, sampleCount * sizeof(float));
    }
    if (zSamples) {
        device.GetQueue().WriteBuffer(zBuf_, 0, zSamples, sampleCount * sizeof(float));
    }

    wgpu::BindGroupEntry entries[5]{};
    entries[0].binding = 0; entries[0].buffer = paramBuf_;
    entries[1].binding = 1; entries[1].buffer = outBuf_;
    entries[2].binding = 2; entries[2].buffer = lumaBuf_;
    entries[3].binding = 3; entries[3].buffer = modBuf_;
    entries[4].binding = 4; entries[4].buffer = zBuf_;
    wgpu::BindGroupDescriptor bgDesc{};
    bgDesc.layout = pipeline_.GetBindGroupLayout(0);
    bgDesc.entryCount = 5; bgDesc.entries = entries;
    wgpu::BindGroup bind = device.CreateBindGroup(&bgDesc);

    wgpu::CommandEncoder enc = device.CreateCommandEncoder();
    {
        wgpu::ComputePassEncoder pass = enc.BeginComputePass();
        pass.SetPipeline(pipeline_);
        pass.SetBindGroup(0, bind);
        pass.DispatchWorkgroups((sampleCount + 63u) / 64u);
        pass.End();
    }
    const std::uint64_t bytes = static_cast<std::uint64_t>(sampleCount) * kVec4Bytes;
    enc.CopyBufferToBuffer(outBuf_, 0, readBuf_, 0, bytes);
    wgpu::CommandBuffer cmd = enc.Finish();
    device.GetQueue().Submit(1, &cmd);

    wgpu::Future f = readBuf_.MapAsync(
        wgpu::MapMode::Read, 0, bytes, wgpu::CallbackMode::WaitAnyOnly,
        [](wgpu::MapAsyncStatus, wgpu::StringView) {});
    if (!WaitFor(device, f, message)) return false;

    const float* mapped = static_cast<const float*>(readBuf_.GetConstMappedRange(0, bytes));
    if (!mapped) { if (message) *message = "Failed to map signal readback buffer"; return false; }

    out->startTime = startTime;
    out->dt = dt;
    out->samples.resize(sampleCount);
    for (std::uint32_t i = 0; i < sampleCount; ++i) {
        out->samples[i] = SignalSample{ mapped[i*4+0], mapped[i*4+1], mapped[i*4+2], mapped[i*4+3] };
    }
    readBuf_.Unmap();
    return true;
}

}  // namespace SignalRack
}  // namespace ItsAllNoise
