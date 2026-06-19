#include "signalrack/live_courier_strip.h"

#include <cassert>
#include <cmath>
#include <cstdio>

using namespace ItsAllNoise::SignalRack;

int main() {
    OutputChannel a{"Scale Pulse", OutputMode::Percentage, 90.0f, 110.0f, "percent", "percentage"};
    OutputChannel b{"Glow", OutputMode::Normalized, 0.0f, 1.0f, "none", "normalized_0_1"};
    OutputChannel c{"Gate", OutputMode::Gate, 0.0f, 1.0f, "none", "gate"};

    SignalSample sample;
    sample.a = 105.0f;
    sample.b = 0.25f;
    sample.c = 1.0f;

    const CourierStrip3 strip = BuildCourierStrip3(sample, a, b, c);
    const float decodedA = DecodeCourierPixel(strip.a);
    const float decodedB = DecodeCourierPixel(strip.b);
    const float decodedC = DecodeCourierPixel(strip.c);

    assert(std::fabs(decodedA - 0.75f) < 1e-6f);
    assert(std::fabs(decodedB - 0.25f) < 1e-6f);
    assert(std::fabs(decodedC - 1.0f) < 1e-6f);

    std::printf("live courier strip OK: A=%.6f B=%.6f C=%.6f\n", decodedA, decodedB, decodedC);
    return 0;
}
