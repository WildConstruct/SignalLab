#ifndef SIGNALRACK_LIVE_COURIER_STRIP_H
#define SIGNALRACK_LIVE_COURIER_STRIP_H

#include <array>

#include "signalrack/signal_output.h"
#include "signalrack/signal_recipe.h"
#include "signalrack/value_codec.h"

namespace ItsAllNoise {
namespace SignalRack {

struct CourierPixel {
    float r = 0.0f;
    float g = 0.0f;
    float b = 0.0f;
};

struct CourierStrip3 {
    CourierPixel a;
    CourierPixel b;
    CourierPixel c;
};

inline CourierPixel PackCourierValue(float value, const OutputChannel& channel) {
    const std::array<float, 3> packed =
        Pack24(NormalizeForStrip(value, channel.min, channel.max));
    return CourierPixel{packed[0], packed[1], packed[2]};
}

inline CourierStrip3 BuildCourierStrip3(const SignalSample& sample,
                                        const OutputChannel& outputA,
                                        const OutputChannel& outputB,
                                        const OutputChannel& outputC) {
    return CourierStrip3{
        PackCourierValue(sample.a, outputA),
        PackCourierValue(sample.b, outputB),
        PackCourierValue(sample.c, outputC),
    };
}

inline float DecodeCourierPixel(const CourierPixel& pixel) {
    return Unpack24(pixel.r, pixel.g, pixel.b);
}

}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_LIVE_COURIER_STRIP_H
