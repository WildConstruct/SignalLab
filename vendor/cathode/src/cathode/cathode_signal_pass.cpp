#include "cathode/cathode_signal_pass.h"

#include "cathode/cathode_effect_contract.h"
#include "cathode/cathode_gpu_image.h"
#include "cathode/preset_registry.h"

#include <algorithm>

namespace cathode {
namespace {

template <typename TSurfaceBundle, typename TSurfaceResolver>
CathodeSignalUniformBlock BuildSignalBlockFromParts(const CathodeParams& params,
                                                    const TSurfaceBundle& surfaces,
                                                    std::uint64_t frameIndex,
                                                    std::uint32_t width,
                                                    std::uint32_t height,
                                                    TSurfaceResolver&& resolveSurface) {
    const CathodeParams resolvedParams = ResolveCathodePresetParams(params);
    CathodeSignalUniformBlock block = {};
    block.frame[0] = width;
    block.frame[1] = height;
    block.frame[2] = static_cast<std::uint32_t>(frameIndex & 0xFFFFFFFFu);
    block.frame[3] = static_cast<std::uint32_t>(resolvedParams.temporalMode);

    block.signal0[0] = std::clamp(resolvedParams.compositeBandwidth, 0.0f, 1.0f);
    block.signal0[1] = std::clamp(resolvedParams.dotCrawlStrength, 0.0f, 1.0f);
    block.signal0[2] = resolvedParams.enableSignal ? 1.0f : 0.0f;
    block.signal0[3] =
        resolveSurface(surfaces, CathodeSurfaceRole::Signal) != nullptr ? 1.0f : 0.0f;
    block.signal1[0] = std::clamp(resolvedParams.chromaLag, 0.0f, 1.0f);
    block.signal1[1] = std::clamp(resolvedParams.chromaNoise, 0.0f, 1.0f);
    block.signal1[2] = static_cast<float>(static_cast<std::uint32_t>(resolvedParams.signalFlavor));
    block.signal1[3] = resolvedParams.signalFlavor == SignalFlavor::ComponentMonitor ? 1.0f : 0.0f;
    block.signal2[0] = std::clamp(resolvedParams.chromaSmearAmount, 0.0f, 1.0f);
    block.signal2[1] = std::clamp(resolvedParams.chromaSmearWidth, 0.0f, 1.0f);
    block.signal2[2] = std::clamp(resolvedParams.signalClipAmount, 0.0f, 1.0f);
    block.signal2[3] = std::clamp(resolvedParams.signalRingingAmount, 0.0f, 1.0f);
    return block;
}

}  // namespace

CathodeSignalUniformBlock BuildCathodeSignalUniformBlock(
    const CathodeRenderRequest& request,
    const std::uint32_t width,
    const std::uint32_t height) {
    const CathodeSurfaceViews surfaces =
        BuildCathodeSurfaceBundle(request.inputs,
                                  request.params.sourceInputMode,
                                  request.input);
    return BuildSignalBlockFromParts(request.params,
                                     surfaces,
                                     request.frameIndex,
                                     width,
                                     height,
                                     ResolveCathodeSurfaceView);
}

CathodeSignalUniformBlock BuildCathodeSignalUniformBlock(
    const CathodeGpuRenderRequest& request,
    const std::uint32_t width,
    const std::uint32_t height) {
    const CathodeGpuSurfaceBundleViews surfaces =
        BuildCathodeGpuSurfaceBundle(request.inputs,
                                     request.params.sourceInputMode,
                                     request.input);
    return BuildSignalBlockFromParts(request.params,
                                     surfaces,
                                     request.frameIndex,
                                     width,
                                     height,
                                     ResolveCathodeGpuSurfaceView);
}

std::string GetCathodeSignalShaderPath() {
    return ResolveCathodeAssetPath("src/shaders/signal/composite_decode.wgsl");
}

}  // namespace cathode
