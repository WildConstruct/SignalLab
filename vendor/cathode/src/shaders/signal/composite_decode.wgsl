#include "../lib/math_utils.wgsl"
#include "../lib/noise_utils.wgsl"

struct SignalUniforms {
  frame : vec4<u32>,
  signal0 : vec4<f32>,
  signal1 : vec4<f32>,
  signal2 : vec4<f32>,
};

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var historyTex : texture_2d<f32>;
@group(0) @binding(2) var outputTex : texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var<uniform> params : SignalUniforms;

fn sampleInput(x : i32, y : i32) -> vec4<f32> {
  let frameSize = textureDimensions(inputTex);
  let width = max(i32(frameSize.x), 1);
  let height = max(i32(frameSize.y), 1);
  return textureLoad(inputTex,
                     vec2<i32>(clamp(x, 0, width - 1), clamp(y, 0, height - 1)),
                     0);
}

fn cathodeRgbToYuv(rgb : vec3<f32>) -> vec3<f32> {
  let y = dot(rgb, vec3<f32>(0.299, 0.587, 0.114));
  let u = (rgb.b - y) * 0.565;
  let v = (rgb.r - y) * 0.713;
  return vec3<f32>(y, u, v);
}

fn cathodeYuvToRgb(yuv : vec3<f32>) -> vec3<f32> {
  let y = yuv.x;
  let u = yuv.y;
  let v = yuv.z;
  return vec3<f32>(y + (1.403 * v),
                   y - (0.344 * u) - (0.714 * v),
                   y + (1.770 * u));
}

fn cathodeLerp(a : f32, b : f32, t : f32) -> f32 {
  return a + ((b - a) * t);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let frameSize = textureDimensions(inputTex);
  if (gid.x >= frameSize.x || gid.y >= frameSize.y) {
    return;
  }

  let xy = vec2<i32>(gid.xy);
  let current = textureLoad(inputTex, xy, 0);
  if (params.signal0.z <= 0.0) {
    textureStore(outputTex, xy, current);
    return;
  }

  let componentMode = params.signal1.w > 0.5;
  let left = sampleInput(xy.x - 1, xy.y);
  let right = sampleInput(xy.x + 1, xy.y);
  let farLeft = sampleInput(xy.x - 2, xy.y);
  let farRight = sampleInput(xy.x + 2, xy.y);

  let softness = cathodeSaturate(1.0 - params.signal0.x);
  let currentYuv = cathodeRgbToYuv(current.rgb);
  let leftYuv = cathodeRgbToYuv(left.rgb);
  let rightYuv = cathodeRgbToYuv(right.rgb);
  let farLeftYuv = cathodeRgbToYuv(farLeft.rgb);
  let farRightYuv = cathodeRgbToYuv(farRight.rgb);

  let lumaBlur =
    (farLeftYuv.x * 0.10) + (leftYuv.x * 0.22) + (currentYuv.x * 0.36) +
    (rightYuv.x * 0.22) + (farRightYuv.x * 0.10);
  let chromaBlurU =
    (farLeftYuv.y * 0.12) + (leftYuv.y * 0.24) + (currentYuv.y * 0.28) +
    (rightYuv.y * 0.24) + (farRightYuv.y * 0.12);
  let chromaBlurV =
    (farLeftYuv.z * 0.12) + (leftYuv.z * 0.24) + (currentYuv.z * 0.28) +
    (rightYuv.z * 0.24) + (farRightYuv.z * 0.12);
  let lumaMix = softness * select(0.38, 0.10, componentMode);
  let chromaMix = softness * select(0.82, 0.18, componentMode);
  var luma = cathodeLerp(currentYuv.x, lumaBlur, lumaMix);
  var chromaU = cathodeLerp(currentYuv.y, chromaBlurU, chromaMix);
  var chromaV = cathodeLerp(currentYuv.z, chromaBlurV, chromaMix);

  let lagPixels = i32(round(1.0 +
                            params.signal1.x * select(8.0, 2.0, componentMode) +
                            softness * select(3.0, 0.5, componentMode)));
  let lagged = sampleInput(xy.x - lagPixels, xy.y);
  let laggedFar = sampleInput(xy.x - (lagPixels + select(2, 1, componentMode)), xy.y);
  let laggedYuv = cathodeRgbToYuv(lagged.rgb);
  let laggedFarYuv = cathodeRgbToYuv(laggedFar.rgb);
  let lagChromaU = cathodeLerp(laggedYuv.y, laggedFarYuv.y, 0.34);
  let lagChromaV = cathodeLerp(laggedYuv.z, laggedFarYuv.z, 0.34);
  let lagMix = params.signal1.x * select(0.98, 0.18, componentMode);
  chromaU = cathodeLerp(chromaU, lagChromaU, lagMix);
  chromaV = cathodeLerp(chromaV, lagChromaV, lagMix);

  let lowBandwidthMush = cathodeSaturate((0.16 - params.signal0.x) / 0.16) *
                         select(1.0, 0.0, componentMode);
  luma = cathodeLerp(luma, lumaBlur, lowBandwidthMush * 0.22);
  chromaU = cathodeLerp(chromaU, chromaBlurU, lowBandwidthMush * 0.30);
  chromaV = cathodeLerp(chromaV, chromaBlurV, lowBandwidthMush * 0.30);

  let chromaSmearAmount = params.signal2.x * select(1.0, 0.18, componentMode);
  if (chromaSmearAmount > 0.0) {
    let smearPixels = i32(max(2.0, round(mix(2.0, 22.0, cathodeSaturate(params.signal2.y)))));
    let smearA = cathodeRgbToYuv(sampleInput(xy.x - smearPixels, xy.y).rgb);
    let smearB = cathodeRgbToYuv(sampleInput(xy.x - (smearPixels / 2), xy.y).rgb);
    let smearC = cathodeRgbToYuv(sampleInput(xy.x + (smearPixels / 2), xy.y).rgb);
    let saturation = cathodeSaturate((abs(currentYuv.y) + abs(currentYuv.z)) * 4.0);
    let smearMix = cathodeSaturate(chromaSmearAmount * (0.18 + saturation * 0.82));
    let smearedU = smearA.y * 0.46 + smearB.y * 0.32 + smearC.y * 0.22;
    let smearedV = smearA.z * 0.46 + smearB.z * 0.32 + smearC.z * 0.22;
    chromaU = cathodeLerp(chromaU, smearedU, smearMix);
    chromaV = cathodeLerp(chromaV, smearedV, smearMix);
  }

  let lumaEdge = abs(rightYuv.x - leftYuv.x) + abs(currentYuv.x - lumaBlur);
  let signalRingingAmount = cathodeSaturate(params.signal2.w) * select(1.0, 0.45, componentMode);
  if (signalRingingAmount > 0.0) {
    let highpass = (currentYuv.x - lumaBlur) + (rightYuv.x - leftYuv.x) * 0.25;
    let ringing = highpass * signalRingingAmount * select(0.42, 0.20, componentMode);
    luma = cathodeSaturate(luma + ringing);
    chromaU += ringing * signalRingingAmount * select(0.08, 0.03, componentMode);
    chromaV -= ringing * signalRingingAmount * select(0.10, 0.04, componentMode);
  }

  let rowPhase = sin(f32(gid.y) * 0.031 + f32(params.frame.z / 2u) * 0.11);
  let crawlPhase = sin(f32(gid.x) * 0.74 + rowPhase * 0.22 + f32(params.frame.z / 2u) * 0.16);
  let crawlGate =
    cathodeSaturate(lumaEdge * 6.0) * params.signal0.y * select(1.0, 0.0, componentMode);
  chromaU += crawlPhase * crawlGate * 0.018;
  chromaV -= crawlPhase * crawlGate * (0.014 + abs(currentYuv.z) * 0.09);

  let rowNoise = (cathodeHash31(vec3<u32>(gid.y / 2u, params.frame.z / 2u, 11u)) * 2.0 - 1.0);
  let fieldNoise = (cathodeHash31(vec3<u32>(gid.y / 8u, params.frame.z / 4u, 29u)) * 2.0 - 1.0);
  let blockNoise =
    (cathodeHash31(vec3<u32>(gid.x / 24u, gid.y / 6u, params.frame.z / 2u)) * 2.0 - 1.0);
  let fineNoise = (cathodeHash31(vec3<u32>(gid.x, gid.y, params.frame.z + 37u)) * 2.0 - 1.0);
  let chromaNoiseStrength = params.signal1.y * select(1.0, 0.28, componentMode);
  let coherentChromaNoise = rowNoise * 0.62 + fieldNoise * 0.28 + blockNoise * 0.10;
  chromaU += (coherentChromaNoise + fineNoise * 0.005) * chromaNoiseStrength * 0.022;
  chromaV += (rowNoise * 0.38 - fieldNoise * 0.44 - blockNoise * 0.14 + fineNoise * 0.005) *
             chromaNoiseStrength * 0.030;
  luma = cathodeSaturate(luma + rowNoise * params.signal1.y * select(0.0035, 0.0015, componentMode));

  let signalClipAmount = cathodeSaturate(params.signal2.z) * select(1.0, 0.55, componentMode);
  if (signalClipAmount > 0.0) {
    let blackPoint = signalClipAmount * 0.10;
    let whitePoint = 1.0 - signalClipAmount * 0.18;
    let crushed = clamp((luma - blackPoint) / max(whitePoint - blackPoint, 0.05), 0.0, 1.0);
    let clipped = clamp(crushed, signalClipAmount * 0.03, 1.0 - signalClipAmount * 0.04);
    luma = cathodeLerp(luma, clipped, signalClipAmount);
    chromaU *= 1.0 - signalClipAmount * 0.18;
    chromaV *= 1.0 - signalClipAmount * 0.12;
  }

  var yuv = vec3<f32>(luma, chromaU, chromaV);

  if (params.frame.w == 1u && params.signal0.w > 0.5) {
    let previous = textureLoad(historyTex, xy, 0);
    let previousYuv = cathodeRgbToYuv(previous.rgb);
    let lumaHistoryMix =
      max(params.signal1.y * select(0.028, 0.010, componentMode),
          params.signal1.x * select(0.018, 0.008, componentMode));
    let chromaHistoryMix =
      max(params.signal1.x * select(0.22, 0.06, componentMode) +
            params.signal1.y * select(0.16, 0.04, componentMode),
          select(params.signal0.y * 0.14, params.signal1.y * 0.05, componentMode));
    yuv.x = cathodeLerp(yuv.x, previousYuv.x, lumaHistoryMix);
    yuv.y = cathodeLerp(yuv.y, previousYuv.y, chromaHistoryMix);
    yuv.z = cathodeLerp(yuv.z, previousYuv.z, chromaHistoryMix);
  }

  let result = clamp(cathodeYuvToRgb(yuv), vec3<f32>(0.0), vec3<f32>(1.0));
  textureStore(outputTex, xy, vec4<f32>(result, current.a));
}
