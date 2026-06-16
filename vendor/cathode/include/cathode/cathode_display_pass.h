#pragma once

#include "cathode/cathode_render_types.h"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <string>

namespace cathode {

namespace detail {

struct DisplayTriad {
    float r = 1.0f;
    float g = 1.0f;
    float b = 1.0f;
};

inline float Clamp01(float value) {
    return std::clamp(value, 0.0f, 1.0f);
}

inline float Lerp(float a, float b, float t) {
    return a + ((b - a) * t);
}

inline float SmoothStep(float edge0, float edge1, float value) {
    if (std::abs(edge1 - edge0) < 1.0e-6f) {
        return value < edge0 ? 0.0f : 1.0f;
    }

    const float t = Clamp01((value - edge0) / (edge1 - edge0));
    return t * t * (3.0f - 2.0f * t);
}

inline float ResolveDisplayPixelSize(float value) {
    return std::clamp(value, 0.25f, 4.0f);
}

inline float ResolveDisplayMaskPitch(DisplayMaskMode mode) {
    switch (mode) {
    case DisplayMaskMode::ApertureGrille:
        return 1.0f;
    case DisplayMaskMode::ShadowMask:
        return 0.84f;
    case DisplayMaskMode::SlotMask:
        return 0.68f;
    }

    return 1.0f;
}

inline DisplayTriad ResolveDisplayTriad(DisplayMaskMode mode,
                                        int x,
                                        int y,
                                        float strength,
                                        float pitch) {
    const int scaledX = static_cast<int>(
        std::floor((static_cast<float>(x) * std::max(pitch, 0.001f)) + 0.0001f));
    DisplayTriad triad = {};

    if (mode == DisplayMaskMode::ApertureGrille) {
        const int slot = ((scaledX % 3) + 3) % 3;
        triad.r = slot == 0 ? 1.0f : 0.38f;
        triad.g = slot == 1 ? 1.0f : 0.38f;
        triad.b = slot == 2 ? 1.0f : 0.38f;
    } else if (mode == DisplayMaskMode::ShadowMask) {
        const bool evenRow = (y % 2) == 0;
        const int slot = ((scaledX % 2) + 2) % 2;
        triad.r = evenRow ? 1.0f : 0.52f;
        triad.g = slot == 0 ? 0.78f : 1.0f;
        triad.b = evenRow ? 0.56f : 1.0f;
    } else {
        const int slot = (((scaledX + y) % 3) + 3) % 3;
        triad.r = slot == 0 ? 1.0f : 0.48f;
        triad.g = slot == 1 ? 1.0f : 0.48f;
        triad.b = slot == 2 ? 1.0f : 0.48f;
    }

    triad.r = Lerp(1.0f, triad.r, strength);
    triad.g = Lerp(1.0f, triad.g, strength);
    triad.b = Lerp(1.0f, triad.b, strength);
    return triad;
}

inline float ResolveDisplayVirtualScanlineCount(std::uint32_t height,
                                                float density,
                                                float pixelSize) {
    const float clampedDensity = Clamp01(density);
    const float densityRatio = Lerp(0.18f, 0.72f, clampedDensity);
    return std::max(1.0f,
                    (static_cast<float>(std::max<std::uint32_t>(1u, height)) * densityRatio) /
                        std::max(pixelSize, 0.001f));
}

inline float ComputeDisplayScanlineFactor(std::uint32_t y,
                                          std::uint32_t height,
                                          float strength,
                                          float density,
                                          float softness,
                                          float pixelSize) {
    if (height == 0u || strength <= 0.0f) {
        return 1.0f;
    }

    const float virtualScanlines = ResolveDisplayVirtualScanlineCount(height, density, pixelSize);
    const float phase =
        std::fmod(((static_cast<float>(y) + 0.5f) / static_cast<float>(height)) * virtualScanlines,
                  1.0f);
    const float beamProfile = 1.0f - std::abs((phase * 2.0f) - 1.0f);
    const float threshold = Lerp(0.72f, 0.08f, Clamp01(softness));
    const float brightBand = SmoothStep(threshold, 1.0f, beamProfile);
    return Lerp(1.0f - Clamp01(strength), 1.0f, brightBand);
}

inline float ComputeDisplayEdgeFalloff(int x,
                                       int y,
                                       std::uint32_t width,
                                       std::uint32_t height,
                                       float curvature) {
    if (width == 0u || height == 0u) {
        return 1.0f;
    }

    const float uvx = (static_cast<float>(x) + 0.5f) / static_cast<float>(width);
    const float uvy = (static_cast<float>(y) + 0.5f) / static_cast<float>(height);
    const float cx = (uvx - 0.5f) * 2.0f;
    const float cy = (uvy - 0.5f) * 2.0f;
    const float radius2 = (cx * cx) + (cy * cy);
    return 1.0f - (std::clamp(curvature, 0.0f, 1.0f) * radius2 * 0.42f);
}

}  // namespace detail

struct CathodeGpuRenderRequest;

// Mirrors the WGSL layout for the CRT display pass so the future Dawn backend
// and the reference path can share one source of truth.
struct CathodeDisplayUniformBlock {
    std::uint32_t frame[4] = {};
    float display0[4] = {};
    float display1[4] = {};
    float display2[4] = {};
    float personality0[4] = {};
    float personality1[4] = {};
    float personality2[4] = {};
    float personality3[4] = {};
    float glitch0[4] = {};
    float glitch1[4] = {};
    float glitch2[4] = {};
    float glitch3[4] = {};
    float glitch4[4] = {};
    float glitch5[4] = {};
    float glitch6[4] = {};
    std::uint32_t flags0[4] = {};
};

static_assert(sizeof(CathodeDisplayUniformBlock) == 256u,
              "CathodeDisplayUniformBlock must stay tightly packed for WGSL.");

CathodeDisplayUniformBlock BuildCathodeDisplayUniformBlock(
    const CathodeRenderRequest& request,
    std::uint32_t width,
    std::uint32_t height);

CathodeDisplayUniformBlock BuildCathodeDisplayUniformBlock(
    const CathodeGpuRenderRequest& request,
    std::uint32_t width,
    std::uint32_t height);

std::string GetCathodeDisplayShaderPath();

}  // namespace cathode
