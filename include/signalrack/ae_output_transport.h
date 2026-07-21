#ifndef SIGNALRACK_AE_OUTPUT_TRANSPORT_H
#define SIGNALRACK_AE_OUTPUT_TRANSPORT_H

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <string>
#include <vector>

#include "signalrack/ae_bake_contract.h"
#include "signalrack/signal_output.h"

namespace ItsAllNoise {
namespace SignalRack {
namespace ae {

inline constexpr const char kSignalRackEffectName[] = "Signal Rack";
inline constexpr const char kSupportIdleRecipeId[] = "sg_support_idle_001";
inline constexpr const char kSupportIdleRecipeVersion[] = "0.3";
inline constexpr const char kSupportIdleOutputId[] = "A";
inline constexpr const char kSupportIdleOutputParameterName[] = "Output A";

enum class OutputTransport {
    Expression,
    Bake,
};

struct OutputTransportReport {
    OutputTransport transport = OutputTransport::Expression;
    std::vector<std::string> preserved;
    std::vector<std::string> lost;
};

struct OutputPublication {
    std::string recipeId;
    std::string recipeVersion;
    std::string outputId;
    std::string layerName;
    std::string effectName;
    std::string parameterName;
    std::string sourceExpression;
    std::string referenceExpression;
    OutputTransportReport report;
};

inline std::string EscapeAeExpressionString(const std::string& value) {
    std::string escaped;
    escaped.reserve(value.size());
    for (const char character : value) {
        switch (character) {
            case '\\': escaped += "\\\\"; break;
            case '"': escaped += "\\\""; break;
            case '\n': escaped += "\\n"; break;
            case '\r': escaped += "\\r"; break;
            default: escaped.push_back(character); break;
        }
    }
    return escaped;
}

inline std::string BuildOutputReferenceExpression(
    const std::string& layerName,
    const std::string& effectName = kSignalRackEffectName,
    const std::string& parameterName = kSupportIdleOutputParameterName) {
    return "thisComp.layer(\"" + EscapeAeExpressionString(layerName) +
           "\").effect(\"" + EscapeAeExpressionString(effectName) +
           "\")(\"" + EscapeAeExpressionString(parameterName) + "\")";
}

// Generated from schemas/examples/18-lensboy-support-idle.json. This is the
// bounded expression publication path for the memoryless S1 recipe. It is not
// the live courier and it does not make AE state canonical.
inline std::string BuildSupportIdleOutputAExpression() {
    return "// Signal Rack sg_support_idle_001@0.3 Output A\\n"
           "var seedPhase=((37*0.07)%1+1)%1;"
           "var x=time*0.12+0.1+seedPhase;"
           "var source=Math.min(1,Math.max(0,(Math.sin(x*Math.PI*2)+1)/2));"
           "Math.min(1,Math.max(0,0.5+(source-0.5)*0.18));";
}

inline double EvaluateSupportIdleOutputA(const double timeSeconds) {
    constexpr double kPi = 3.141592653589793238462643383279502884;
    constexpr double kSeedPhase = 0.59;
    const double x = timeSeconds * 0.12 + 0.1 + kSeedPhase;
    const double source = std::min(
        1.0, std::max(0.0, (std::sin(x * kPi * 2.0) + 1.0) * 0.5));
    return std::min(1.0, std::max(0.0, 0.5 + (source - 0.5) * 0.18));
}

inline SignalOutputs EvaluateSupportIdleOutputAWindow(
    const double startTime,
    const double frameDuration,
    const std::size_t sampleCount) {
    SignalOutputs outputs;
    outputs.startTime = static_cast<float>(startTime);
    outputs.dt = static_cast<float>(frameDuration);
    if (!std::isfinite(startTime) || !std::isfinite(frameDuration) ||
        frameDuration <= 0.0) {
        return outputs;
    }
    outputs.samples.reserve(sampleCount);
    for (std::size_t index = 0; index < sampleCount; ++index) {
        const double time = startTime + static_cast<double>(index) * frameDuration;
        const float value = static_cast<float>(EvaluateSupportIdleOutputA(time));
        outputs.samples.push_back({value, value, 0.0f, 0.0f});
    }
    return outputs;
}

inline OutputTransportReport SupportIdleTransportReport(
    const OutputTransport transport) {
    OutputTransportReport report;
    report.transport = transport;
    report.preserved = {
        "recipeId", "recipeVersion", "outputId", "normalizedProfile",
        "memorylessArbitraryTimeSemantics",
    };
    if (transport == OutputTransport::Expression) {
        report.lost = {"wgslExecutionPath"};
    } else {
        report.preserved.push_back("frameCenterValues");
        report.lost = {"liveSourceLink", "betweenFrameContinuousEvaluation"};
    }
    return report;
}

inline OutputPublication BuildSupportIdleOutputAPublication(
    const std::string& layerName) {
    return {
        kSupportIdleRecipeId,
        kSupportIdleRecipeVersion,
        kSupportIdleOutputId,
        layerName,
        kSignalRackEffectName,
        kSupportIdleOutputParameterName,
        BuildSupportIdleOutputAExpression(),
        BuildOutputReferenceExpression(layerName),
        SupportIdleTransportReport(OutputTransport::Expression),
    };
}

inline std::vector<BakeKeyframe> BuildSupportIdleOutputABake(
    const double startTime,
    const double frameDuration,
    const std::size_t sampleCount) {
    return BuildBakeKeyframes(
        EvaluateSupportIdleOutputAWindow(startTime, frameDuration, sampleCount),
        OutputSlot::A);
}

}  // namespace ae
}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_AE_OUTPUT_TRANSPORT_H
