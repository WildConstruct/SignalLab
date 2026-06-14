// =============================================================================
//  signalrack/signal_recipe.h
//  Public contract: the portable description of a Signal Rack instance.
//
//  Follows Wild Construct conventions observed in ethera-etheros:
//    runtime path : SignalRecipe -> CompiledSignalConfig -> runtime
//    preset path  : SignalRecipe -> .wcx payload
//    naming path  : SignalRecipe -> Moniker -> suggested name
//
//  This header is intentionally free of Dawn/WebGPU and runtime internals so
//  hosts (AE plugin, tools, tests) can depend on the contract cheaply
//  (cf. docs/audits/circular-deps-audit in the Etheros tree).
// =============================================================================
#ifndef SIGNALRACK_SIGNAL_RECIPE_H
#define SIGNALRACK_SIGNAL_RECIPE_H

#include <array>
#include <cstdint>
#include <string>

namespace ItsAllNoise {
namespace SignalRack {

// Source families exposed by the rack (the visible subset of the library).
enum class SourceType : std::uint32_t {
    Sine       = 1,
    Pulse      = 2,
    Ramp       = 3,
    Noise      = 4,
    RandomWalk = 5,
    Linked     = 6,   // Input A (sidechain), resolved to a scalar by the host
    LumaProbe  = 7,   // host samples a layer and supplies per-sample luma
};

// Output profile == "interpreted scalar output" class. The mode selects how a
// normalized 0..1 base is interpreted into a channel value + sensible range.
enum class OutputMode : std::uint32_t {
    Normalized = 1,   // 0..1
    Signed     = 2,   // -1..1
    Percentage = 3,
    Degrees    = 4,
    Pixels     = 5,
    Custom     = 6,   // arbitrary [min,max]
    Gate       = 7,   // 0/1 by threshold
    Trigger    = 8,   // short rising-edge pulse
};

// One output channel definition. Min/Max carry the real range; the mode chose
// defaults at authoring time and selects gate/trigger behaviour at runtime.
struct OutputChannel {
    std::string name;                  // e.g. "Luma Normalized"
    OutputMode  mode = OutputMode::Normalized;
    float       min  = 0.0f;
    float       max  = 1.0f;
    std::string units;                 // e.g. "percent", "particlesPerSecond"
    std::string profileId;             // stable profile id, e.g. "entropy_birth_driver"
};

struct SourceParams {
    SourceType type   = SourceType::Sine;
    float rate        = 1.0f;          // Hz
    float amount      = 1.0f;
    float phase       = 0.0f;          // turns 0..1
    float offset      = 0.0f;          // DC offset on normalized base
    // probe-only:
    std::string sourceLayer;           // AE layer name / id for LumaProbe
    std::array<float, 2> probePoint{ 0.0f, 0.0f };
    float probeRadius = 0.5f;          // 0.5 = 1x1, 2.5 = 5x5
};

struct ProcessParams {
    float smooth    = 0.0f;            // 0..1 box-average (pre-process)
    // pointwise shaping (engine-owned; see shaders/signal_core.wgsl):
    float gain      = 1.0f;
    float bias      = 0.0f;
    float quantize  = 0.0f;           // 0 = off, else number of steps
    float gate      = 0.0f;           // 0 = off, else threshold
    float lag       = 0.0f;           // 0..1 finite EWMA
    float warp      = 0.0f;           // -1..1 contrast S-curve (0 = identity)
    float fold      = 0.0f;           // 0..1 triangle wavefolder (0 = identity)
    bool  invert    = false;
    bool  rectify   = false;
    // sidechain modulation (signal-drives-signal); per-sample input via request:
    std::uint32_t modTarget = 0;      // 0 off, 1 amplitude, 2 rate, 3 phase
    float         modDepth  = 0.0f;
    float threshold = 0.5f;           // reserved (stateful/native path)
    float hysteresis= 0.0f;           // reserved (bake/native only)
};

// Sidechain bindings. Empty = unconnected. Format "<rackId>:<A|B|C>".
struct InputBindings {
    std::string a, b, c;
};

// The full portable recipe.
struct SignalRecipe {
    std::string   id      = "sg_000";
    std::string   name    = "Untitled Rack";
    std::string   version = "0.2";
    std::uint32_t seed    = 1;

    InputBindings inputs;
    SourceParams  source;
    ProcessParams process;
    OutputChannel outputA;
    OutputChannel outputB;
    OutputChannel outputC;

    // Optional Wild Construct payload identity (generic AE never sees it).
    std::string wcTargetIdentity;     // e.g. "cathode_instability_driver"
};

}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_SIGNAL_RECIPE_H
