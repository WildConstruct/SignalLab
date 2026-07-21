#include "signalrack/ae_output_transport.h"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <numeric>
#include <string>
#include <vector>

namespace {

int failures = 0;

void Expect(const bool condition, const std::string& message) {
    if (!condition) {
        std::cerr << "FAIL: " << message << '\n';
        ++failures;
    }
}

}  // namespace

int main() {
    namespace sr = ItsAllNoise::SignalRack;
    namespace ae = ItsAllNoise::SignalRack::ae;

    const auto publication = ae::BuildSupportIdleOutputAPublication(
        "SR · Support \\\"Idle\\\"");
    Expect(publication.recipeId == "sg_support_idle_001" &&
               publication.recipeVersion == "0.3" &&
               publication.outputId == "A" &&
               publication.effectName == "Signal Rack" &&
               publication.parameterName == "Output A",
           "publication retains stable recipe, output, effect, and parameter identity");
    Expect(publication.referenceExpression ==
               "thisComp.layer(\"SR · Support \\\\\\\"Idle\\\\\\\"\")"
               ".effect(\"Signal Rack\")(\"Output A\")",
           "pick-whip expression is one reference with escaped host names");
    Expect(publication.sourceExpression.find("sampleImage") == std::string::npos &&
               publication.sourceExpression.find("time*0.12") != std::string::npos &&
               publication.sourceExpression.find("sg_support_idle_001@0.3") !=
                   std::string::npos,
           "S1 expression is identity-stamped and does not use the live courier");
    Expect(publication.report.preserved.size() == 5u &&
               publication.report.lost == std::vector<std::string>{"wgslExecutionPath"},
           "expression publication reports preservation and execution-path loss");

    std::vector<double> times(4096u);
    for (std::size_t index = 0; index < times.size(); ++index) {
        times[index] = -20.0 + static_cast<double>(index) * 80.0 /
                                  static_cast<double>(times.size() - 1u);
    }
    std::vector<double> baseline;
    baseline.reserve(times.size());
    for (const double time : times) {
        baseline.push_back(ae::EvaluateSupportIdleOutputA(time));
    }
    std::vector<std::size_t> order(times.size());
    std::iota(order.begin(), order.end(), 0u);
    std::uint32_t state = 0x0a2f17u;
    for (std::size_t index = order.size() - 1u; index > 0u; --index) {
        state = state * 1664525u + 1013904223u;
        const std::size_t swap = state % (index + 1u);
        std::swap(order[index], order[swap]);
    }
    for (const std::size_t index : order) {
        Expect(ae::EvaluateSupportIdleOutputA(times[index]) == baseline[index],
               "arbitrary frame order reproduces exact Output A values");
    }
    const auto bounds = std::minmax_element(baseline.begin(), baseline.end());
    Expect(*bounds.first >= 0.41 && *bounds.first < 0.411 &&
               *bounds.second <= 0.59 && *bounds.second > 0.589,
           "published Output A retains the S1 narrowed normalized range");

    constexpr double kStart = -1.25;
    constexpr double kFrameDuration = 1.0 / 29.97;
    constexpr std::size_t kFrames = 240u;
    const auto keys = ae::BuildSupportIdleOutputABake(
        kStart, kFrameDuration, kFrames);
    Expect(keys.size() == kFrames, "dense bake emits one key per frame center");
    for (std::size_t index = 0; index < keys.size(); ++index) {
        const double time = kStart + static_cast<double>(index) * kFrameDuration;
        Expect(std::abs(static_cast<double>(keys[index].time) - time) <= 1e-6 &&
                   std::abs(static_cast<double>(keys[index].value) -
                            ae::EvaluateSupportIdleOutputA(time)) <= 1e-6,
               "baked time/value matches live arbitrary-time evaluation");
    }
    const auto bakeReport = ae::SupportIdleTransportReport(ae::OutputTransport::Bake);
    Expect(std::find(bakeReport.preserved.begin(), bakeReport.preserved.end(),
                     "frameCenterValues") != bakeReport.preserved.end() &&
               bakeReport.lost == std::vector<std::string>{
                   "liveSourceLink", "betweenFrameContinuousEvaluation"},
           "bake reports its deterministic preservation and detach losses");
    Expect(ae::BuildSupportIdleOutputABake(0.0, 0.0, 12u).empty(),
           "invalid bake cadence refuses to emit misleading keys");

    if (failures != 0) return 1;
    std::cout << "Signal Rack A2 output transport passed: 4096 arbitrary-time "
                 "samples and 240 dense bake keys.\n";
    return 0;
}
