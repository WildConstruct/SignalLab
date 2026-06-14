#pragma once

#include "cathode/cathode_render_types.h"

#include <cstdint>
#include <string>

namespace cathode {

struct CathodeGpuRenderRequest;

struct CathodeSignalUniformBlock {
    std::uint32_t frame[4] = {};
    float signal0[4] = {};
    float signal1[4] = {};
    float signal2[4] = {};
};

static_assert(sizeof(CathodeSignalUniformBlock) == 64u,
              "CathodeSignalUniformBlock must stay tightly packed for WGSL.");

CathodeSignalUniformBlock BuildCathodeSignalUniformBlock(
    const CathodeRenderRequest& request,
    std::uint32_t width,
    std::uint32_t height);

CathodeSignalUniformBlock BuildCathodeSignalUniformBlock(
    const CathodeGpuRenderRequest& request,
    std::uint32_t width,
    std::uint32_t height);

std::string GetCathodeSignalShaderPath();

}  // namespace cathode
