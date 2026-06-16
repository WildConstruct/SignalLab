#include "cathode/cathode_display_pass.h"

#include "cathode/cathode_effect_contract.h"
#include "cathode/cathode_gpu_image.h"
#include "cathode/preset_registry.h"

#include <algorithm>

namespace cathode {
namespace {

CathodeLookPersonality ResolveDisplayPersonality(const CathodeParams& params) {
    const CathodeLookDefinition* definition = FindLookDefinition(params.preset);
    return definition != nullptr ? definition->personality : CathodeLookPersonality{};
}

template <typename TSurfaceBundle, typename TSurfaceResolver>
CathodeDisplayUniformBlock BuildDisplayBlockFromParts(const CathodeParams& params,
                                                      const TSurfaceBundle& surfaces,
                                                      std::uint64_t frameIndex,
                                                      std::uint32_t width,
                                                      std::uint32_t height,
                                                      TSurfaceResolver&& resolveSurface) {
    const CathodeParams resolvedParams = ResolveCathodePresetParams(params);
    const CathodeLookPersonality personality = ResolveDisplayPersonality(resolvedParams);
    CathodeDisplayUniformBlock block = {};
    block.frame[0] = width;
    block.frame[1] = height;
    block.frame[2] = static_cast<std::uint32_t>(frameIndex & 0xFFFFFFFFu);
    block.frame[3] = static_cast<std::uint32_t>(resolvedParams.temporalMode);

    block.display0[0] = resolvedParams.displayAmount;
    block.display0[1] = resolvedParams.beamSharpness;
    block.display0[2] = resolvedParams.maskStrength;
    block.display0[3] = resolvedParams.bloomAmount;

    block.display1[0] = resolvedParams.scanlineStrength;
    block.display1[1] = std::clamp(resolvedParams.scanlineDensity, 0.0f, 1.0f);
    block.display1[2] = std::clamp(resolvedParams.scanlineSoftness, 0.0f, 1.0f);
    block.display1[3] = resolvedParams.displayPersistence;

    const float pixelSize = detail::ResolveDisplayPixelSize(resolvedParams.displayPixelSize);
    block.display2[0] = resolvedParams.displayCurvature;
    block.display2[1] = detail::ResolveDisplayMaskPitch(resolvedParams.displayMaskMode) / pixelSize;
    block.display2[2] = resolvedParams.enableDisplay ? 1.0f : 0.0f;
    block.display2[3] = pixelSize;

    block.personality0[0] = personality.rgbGainBias[0];
    block.personality0[1] = personality.rgbGainBias[1];
    block.personality0[2] = personality.rgbGainBias[2];
    block.personality0[3] = personality.contrastBias;

    block.personality1[0] = personality.rgbLiftBias[0];
    block.personality1[1] = personality.rgbLiftBias[1];
    block.personality1[2] = personality.rgbLiftBias[2];
    block.personality1[3] = personality.highlightRollOff;

    block.personality2[0] = personality.bloomTintBias[0];
    block.personality2[1] = personality.bloomTintBias[1];
    block.personality2[2] = personality.bloomTintBias[2];
    block.personality2[3] = personality.chromaSaturationBias;

    block.personality3[0] = personality.blackFloorBias;
    block.personality3[1] = 0.0f;
    block.personality3[2] = 0.0f;
    block.personality3[3] = 0.0f;

    block.glitch0[0] = std::clamp(resolvedParams.analogGlitchAmount, 0.0f, 1.0f);
    block.glitch0[1] = std::clamp(resolvedParams.analogGlitchFrequency, 0.0f, 1.0f);
    block.glitch0[2] = std::clamp(resolvedParams.digitalGlitchAmount, 0.0f, 1.0f);
    block.glitch0[3] = std::clamp(resolvedParams.digitalBlockSize, 0.0f, 1.0f);
    block.glitch1[0] = std::clamp(resolvedParams.rfInterferenceAmount, 0.0f, 1.0f);
    block.glitch1[1] = std::clamp(resolvedParams.humBarAmount, 0.0f, 1.0f);
    block.glitch1[2] = std::clamp(resolvedParams.macroblockAmount, 0.0f, 1.0f);
    block.glitch1[3] = std::clamp(resolvedParams.macroblockSize, 0.0f, 1.0f);
    block.glitch2[0] = std::clamp(resolvedParams.posterizeBits, 2.0f, 8.0f);
    block.glitch2[1] = std::clamp(resolvedParams.mosquitoNoiseAmount, 0.0f, 1.0f);
    block.glitch2[2] = std::clamp(resolvedParams.mosquitoNoiseRadius, 0.0f, 1.0f);
    block.glitch2[3] = 0.0f;
    block.glitch3[0] = std::clamp(resolvedParams.hueDriftAmount, 0.0f, 1.0f);
    block.glitch3[1] = std::clamp(resolvedParams.hueDriftRate, 0.0f, 1.0f);
    block.glitch3[2] = std::clamp(resolvedParams.rfInterferenceFrequency, 0.0f, 1.0f);
    block.glitch3[3] = std::clamp(resolvedParams.humBarRate, 0.0f, 1.0f);
    block.glitch4[0] = std::clamp(resolvedParams.sparkleDensity, 0.0f, 1.0f);
    block.glitch4[1] = std::clamp(resolvedParams.digitalDropoutDensity, 0.0f, 1.0f);
    block.glitch4[2] = std::clamp(resolvedParams.digitalDropoutSize, 0.0f, 1.0f);
    block.glitch4[3] = 0.0f;
    block.glitch5[0] = std::clamp(resolvedParams.printThroughAmount, 0.0f, 1.0f);
    block.glitch5[1] = std::clamp(resolvedParams.printThroughOffset, 0.0f, 1.0f);
    block.glitch5[2] = std::clamp(resolvedParams.ghostTrailAmount, 0.0f, 1.0f);
    block.glitch5[3] = std::clamp(resolvedParams.ghostTrailDecay, 0.0f, 1.0f);
    block.glitch6[0] =
        std::clamp(resolvedParams.digitalConcealmentHistoryBlend, 0.0f, 1.0f);
    block.glitch6[1] = std::clamp(resolvedParams.frameHoldProbability, 0.0f, 1.0f);
    block.glitch6[2] = std::clamp(resolvedParams.frameRepeatCount, 0.0f, 1.0f);
    block.glitch6[3] = 0.0f;

    block.flags0[0] = static_cast<std::uint32_t>(resolvedParams.displayMaskMode);
    block.flags0[1] =
        resolveSurface(surfaces, CathodeSurfaceRole::DisplayMask) != nullptr ? 1u : 0u;
    block.flags0[2] =
        resolveSurface(surfaces, CathodeSurfaceRole::Display) != nullptr ? 1u : 0u;
    block.flags0[3] = static_cast<std::uint32_t>(resolvedParams.displayPhosphorMode);
    return block;
}

}  // namespace

CathodeDisplayUniformBlock BuildCathodeDisplayUniformBlock(
    const CathodeRenderRequest& request,
    std::uint32_t width,
    std::uint32_t height) {
    const CathodeSurfaceViews surfaces =
        BuildCathodeSurfaceBundle(request.inputs,
                                  request.params.sourceInputMode,
                                  request.input);
    return BuildDisplayBlockFromParts(request.params,
                                      surfaces,
                                      request.frameIndex,
                                      width,
                                      height,
                                      ResolveCathodeSurfaceView);
}

CathodeDisplayUniformBlock BuildCathodeDisplayUniformBlock(
    const CathodeGpuRenderRequest& request,
    std::uint32_t width,
    std::uint32_t height) {
    const CathodeGpuSurfaceBundleViews surfaces =
        BuildCathodeGpuSurfaceBundle(request.inputs,
                                     request.params.sourceInputMode,
                                     request.input);
    return BuildDisplayBlockFromParts(request.params,
                                      surfaces,
                                      request.frameIndex,
                                      width,
                                      height,
                                      ResolveCathodeGpuSurfaceView);
}

std::string GetCathodeDisplayShaderPath() {
    return ResolveCathodeAssetPath("src/shaders/display/crt_mask_beam.wgsl");
}

}  // namespace cathode
