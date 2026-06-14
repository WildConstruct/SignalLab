// =============================================================================
//  signalrack/value_codec.h
//  LIVE-COURIER value codec. Shared by the plugin (encode) and the generated AE
//  expression (decode). Mirrors prototypes/webgpu-lab/value-codec.js exactly.
//
//  The plugin's Render() encodes each channel's NORMALIZED-within-range value
//  (n = (value - min)/(max - min)) into a pixel of a 3x1 value strip on the rack
//  layer. A generated one-shot expression on a target reads that pixel with
//  sampleImage and remaps n back through the channel's [min,max]. Engine stays
//  in WGSL; the expression only decodes a pixel.
//
//  COLOR MANAGEMENT: encode/decode assume the strip is sampled WITHOUT a
//  working-space/gamma transform (linear 32-bpc pass-through). See
//  docs/ae-output-publishing.md and codec-validate.js (gamma corruption test).
// =============================================================================
#ifndef SIGNALRACK_VALUE_CODEC_H
#define SIGNALRACK_VALUE_CODEC_H

#include <array>
#include <cmath>
#include <cstdint>

namespace ItsAllNoise {
namespace SignalRack {

inline constexpr std::int32_t kMax24 = 16777215;  // 2^24 - 1

inline float clamp01(float v) { return v < 0.f ? 0.f : (v > 1.f ? 1.f : v); }

// normalized [0,1] -> 8-bit-per-channel RGB in [0,1] (24-bit packed)
inline std::array<float, 3> Pack24(float v) {
    std::int32_t i = static_cast<std::int32_t>(std::lround(clamp01(v) * kMax24));
    float r = static_cast<float>((i >> 16) & 0xff);
    float g = static_cast<float>((i >> 8) & 0xff);
    float b = static_cast<float>(i & 0xff);
    return { r / 255.f, g / 255.f, b / 255.f };
}

// RGB in [0,1] -> normalized [0,1]
inline float Unpack24(float r, float g, float b) {
    std::int32_t ir = static_cast<std::int32_t>(std::lround(r * 255.f));
    std::int32_t ig = static_cast<std::int32_t>(std::lround(g * 255.f));
    std::int32_t ib = static_cast<std::int32_t>(std::lround(b * 255.f));
    return static_cast<float>((ir << 16) | (ig << 8) | ib) / static_cast<float>(kMax24);
}

// Normalize a channel value into [0,1] for packing (inverse of the profile remap).
inline float NormalizeForStrip(float value, float mn, float mx) {
    if (mx == mn) return 0.f;
    return clamp01((value - mn) / (mx - mn));
}

}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_VALUE_CODEC_H
