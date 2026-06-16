#include "../lib/math_utils.wgsl"

struct DisplayUniforms {
  frame : vec4<u32>,
  display0 : vec4<f32>,
  display1 : vec4<f32>,
  display2 : vec4<f32>,
  personality0 : vec4<f32>,
  personality1 : vec4<f32>,
  personality2 : vec4<f32>,
  personality3 : vec4<f32>,
  glitch0 : vec4<f32>,
  glitch1 : vec4<f32>,
  glitch2 : vec4<f32>,
  glitch3 : vec4<f32>,
  glitch4 : vec4<f32>,
  glitch5 : vec4<f32>,
  glitch6 : vec4<f32>,
  flags0 : vec4<u32>,
};

@group(0) @binding(0) var inputTex : texture_2d<f32>;
@group(0) @binding(1) var historyTex : texture_2d<f32>;
@group(0) @binding(2) var outputTex : texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var linearSampler : sampler;
@group(0) @binding(4) var displayMaskTex : texture_2d<f32>;
@group(0) @binding(5) var displayMaskSampler : sampler;
@group(0) @binding(6) var<storage, read> u : DisplayUniforms;

fn curvedUv(uv : vec2<f32>, curvature : f32) -> vec2<f32> {
  let centered = uv * 2.0 - 1.0;
  let r2 = dot(centered, centered);
  let warped = centered * (1.0 + r2 * curvature * 0.42);
  return warped * 0.5 + 0.5;
}

fn maskFor(mode : u32, coord : vec2<u32>, pitch : f32) -> vec3<f32> {
  let scaledX = u32(floor((f32(coord.x) * max(pitch, 0.001)) + 0.0001));
  if (mode == 1u) {
    let evenRow = coord.y % 2u == 0u;
    let slot = scaledX % 2u;
    return vec3<f32>(
      select(0.52, 1.0, evenRow),
      select(1.0, 0.78, slot == 0u),
      select(1.0, 0.56, evenRow)
    );
  }
  if (mode == 2u) {
    let slot = (scaledX + coord.y) % 3u;
    if (slot == 0u) {
      return vec3<f32>(1.0, 0.48, 0.48);
    }
    if (slot == 1u) {
      return vec3<f32>(0.48, 1.0, 0.48);
    }
    return vec3<f32>(0.48, 0.48, 1.0);
  }

  let slot = scaledX % 3u;
  if (slot == 0u) {
    return vec3<f32>(1.0, 0.35, 0.35);
  }
  if (slot == 1u) {
    return vec3<f32>(0.35, 1.0, 0.35);
  }
  return vec3<f32>(0.35, 0.35, 1.0);
}

fn sampleMaskWeight(uv : vec2<f32>) -> f32 {
  if (u.flags0.y == 0u) {
    return 1.0;
  }
  let sample = textureSampleLevel(displayMaskTex, displayMaskSampler, clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0);
  return cathodeSaturate(dot(sample.rgb, vec3<f32>(0.2126, 0.7152, 0.0722)));
}

fn virtualScanlineCount(height : u32, density : f32, pixelSize : f32) -> f32 {
  let densityRatio = mix(0.18, 0.72, cathodeSaturate(density));
  return max(1.0, (f32(max(height, 1u)) * densityRatio) / max(pixelSize, 0.001));
}

fn clamp3(value : vec3<f32>, lo : f32, hi : f32) -> vec3<f32> {
  return clamp(value, vec3<f32>(lo), vec3<f32>(hi));
}

fn applyHighlightRollOff(color : vec3<f32>, amount : f32) -> vec3<f32> {
  let roll = cathodeSaturate(amount);
  let threshold = mix(1.15, 0.65, roll);
  let excess = max(color - vec3<f32>(threshold), vec3<f32>(0.0));
  let compressed = excess / (1.0 + excess * mix(0.0, 2.2, roll));
  return min(color, vec3<f32>(threshold)) + compressed;
}

fn applyLookPersonality(color : vec3<f32>, highlight : f32) -> vec3<f32> {
  var result = color;
  let shadowMask = 1.0 - cathodeSaturate(highlight);
  let bloomTint = clamp3(vec3<f32>(1.0, 0.92, 0.86) + u.personality2.xyz, 0.4, 1.6);

  result += u.personality1.xyz * shadowMask;
  result += vec3<f32>(u.personality3.x * shadowMask);
  result *= vec3<f32>(1.0) + u.personality0.xyz;

  let luma = dot(result, vec3<f32>(0.2126, 0.7152, 0.0722));
  let saturation = clamp(1.0 + u.personality2.w, 0.0, 2.0);
  result = mix(vec3<f32>(luma), result, saturation);

  let contrast = 1.0 + u.personality0.w;
  result = ((result - vec3<f32>(0.5)) * contrast) + vec3<f32>(0.5);
  result = applyHighlightRollOff(result, u.personality1.w);
  return clamp3(result, 0.0, 1.0);
}

fn phosphorTint(mode : u32) -> vec3<f32> {
  if (mode == 2u) {
    return vec3<f32>(0.58, 1.18, 0.54);
  }
  if (mode == 3u) {
    return vec3<f32>(1.22, 0.82, 0.30);
  }
  if (mode == 4u) {
    return vec3<f32>(0.44, 0.70, 1.34);
  }
  if (mode == 5u) {
    return vec3<f32>(1.0, 1.0, 0.94);
  }
  return vec3<f32>(1.0);
}

fn applyPhosphorMode(mode : u32, color : vec3<f32>) -> vec3<f32> {
  if (mode == 0u) {
    return color;
  }
  let y = dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
  return clamp3(vec3<f32>(y) * phosphorTint(mode), 0.0, 1.0);
}

fn scanlineFactor(pixelUv : vec2<f32>) -> f32 {
  if (u.display1.x <= 0.0) {
    return 1.0;
  }

  let virtualLines = virtualScanlineCount(u.frame.y, u.display1.y, u.display2.w);
  let phase = fract(pixelUv.y * virtualLines);
  let beamProfile = 1.0 - abs(phase * 2.0 - 1.0);
  let threshold = mix(0.72, 0.08, cathodeSaturate(u.display1.z));
  let brightBand = smoothstep(threshold, 1.0, beamProfile);
  return mix(1.0 - cathodeSaturate(u.display1.x), 1.0, brightBand);
}

fn glitchHash(value : vec3<u32>) -> f32 {
  var h = value.x * 1664525u + 1013904223u;
  h = h ^ (value.y * 22695477u + 1u);
  h = h ^ (value.z * 1103515245u + 12345u);
  return f32(h & 65535u) / 65535.0;
}

fn quantizeColor(color : vec3<f32>, levels : f32) -> vec3<f32> {
  let safeLevels = max(2.0, levels);
  return floor(clamp(color, vec3<f32>(0.0), vec3<f32>(1.0)) * safeLevels) / safeLevels;
}

fn rotateHuePreservingLuma(color : vec3<f32>, angle : f32) -> vec3<f32> {
  let lumaWeights = vec3<f32>(0.2126, 0.7152, 0.0722);
  let luma = dot(color, lumaWeights);
  let chroma = color - vec3<f32>(luma);
  let crossChroma = vec3<f32>(chroma.g - chroma.b, chroma.b - chroma.r, chroma.r - chroma.g);
  return clamp(vec3<f32>(luma) + chroma * cos(angle) + crossChroma * sin(angle) * 0.57735,
               vec3<f32>(0.0),
               vec3<f32>(1.0));
}

fn applyOutputGlitches(pixelUv : vec2<f32>, coord : vec2<u32>, color : vec4<f32>) -> vec4<f32> {
  let analogAmount = cathodeSaturate(u.glitch0.x);
  let analogFrequency = cathodeSaturate(u.glitch0.y);
  let digitalAmount = cathodeSaturate(u.glitch0.z);
  let digitalBlockSize = cathodeSaturate(u.glitch0.w);
  let rfAmount = cathodeSaturate(u.glitch1.x);
  let humAmount = cathodeSaturate(u.glitch1.y);
  let macroblockAmount = cathodeSaturate(max(u.glitch1.z, digitalAmount));
  let macroblockSize = cathodeSaturate(max(u.glitch1.w, digitalBlockSize));
  let posterizeBits = clamp(u.glitch2.x, 2.0, 8.0);
  let mosquitoAmount = cathodeSaturate(u.glitch2.y);
  let mosquitoRadius = cathodeSaturate(u.glitch2.z);
  let hueDriftAmount = cathodeSaturate(u.glitch3.x);
  let hueDriftRate = cathodeSaturate(u.glitch3.y);
  let rfFrequency = cathodeSaturate(u.glitch3.z);
  let humRate = cathodeSaturate(u.glitch3.w);
  let sparkleDensity = cathodeSaturate(u.glitch4.x);
  let digitalDropoutDensity = cathodeSaturate(u.glitch4.y);
  let digitalDropoutSize = cathodeSaturate(u.glitch4.z);
  let historyBlend = cathodeSaturate(u.glitch6.x);
  let frameHoldProbability = cathodeSaturate(u.glitch6.y);
  let frameRepeatCount = cathodeSaturate(u.glitch6.z);
  if (analogAmount <= 0.0 && rfAmount <= 0.0 && humAmount <= 0.0 &&
      digitalAmount <= 0.0 && macroblockAmount <= 0.0 &&
      posterizeBits >= 7.999 && mosquitoAmount <= 0.0 &&
      hueDriftAmount <= 0.0 && sparkleDensity <= 0.0 &&
      digitalDropoutDensity <= 0.0 && frameHoldProbability <= 0.0) {
    return color;
  }

  let frameSize = vec2<f32>(f32(max(u.frame.x, 1u)), f32(max(u.frame.y, 1u)));
  let frame = f32(u.frame.z);
  var result = color.rgb;

  if (frameHoldProbability > 0.0 && u.flags0.z == 1u) {
    let holdSpan = max(1u, u32(round(mix(1.0, 10.0, frameRepeatCount))));
    let holdCell = u.frame.z / holdSpan;
    let holdSeed = glitchHash(vec3<u32>(holdCell, holdSpan, 911u));
    if (holdSeed > mix(0.999, 0.55, frameHoldProbability)) {
      let historySample = textureSampleLevel(historyTex, linearSampler, clamp(pixelUv, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0).rgb;
      result = mix(result, historySample, cathodeSaturate(0.35 + frameHoldProbability * 0.65));
    }
  }

  if (hueDriftAmount > 0.0) {
    let linePhase =
      sin(pixelUv.y * mix(2.0, 16.0, hueDriftRate) + frame * mix(0.006, 0.048, hueDriftRate));
    let globalPhase = sin(frame * mix(0.011, 0.090, hueDriftRate) + analogFrequency * 2.1);
    let angle = (linePhase * 0.62 + globalPhase * 0.38) * hueDriftAmount * 1.25;
    result = rotateHuePreservingLuma(result, angle);
  }

  if (analogAmount > 0.0) {
    let lineCellHeight = max(1u, u32(round(mix(30.0, 3.0, analogFrequency))));
    let rowCell = coord.y / lineCellHeight;
    let frameDivisor = max(1u, u32(round(mix(8.0, 1.0, analogFrequency))));
    let frameCell = u.frame.z / frameDivisor;
    let rowSeed = glitchHash(vec3<u32>(rowCell, frameCell, 307u));
    let burst = select(0.0, 1.0, rowSeed > mix(0.996, 0.72, analogAmount * analogFrequency));
    let rowNoise = glitchHash(vec3<u32>(rowCell + 19u, u.frame.z / 2u, 331u)) * 2.0 - 1.0;
    let wobble = sin((f32(coord.y) * 0.055) + (frame * 0.16) + rowNoise) * analogAmount * 4.5;
    let tearShift = rowNoise * frameSize.x * (0.015 + analogAmount * 0.075) * burst;
    let shift = round(wobble + tearShift);
    let shiftedUv = vec2<f32>(pixelUv.x + shift / frameSize.x, pixelUv.y);
    let shifted = textureSampleLevel(inputTex, linearSampler, clamp(shiftedUv, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0);
    let chromaShift =
      round((2.0 + analogAmount * 9.0) * select(-1.0, 1.0, rowNoise >= 0.0)) / frameSize.x;
    let chromaA = textureSampleLevel(inputTex, linearSampler, clamp(shiftedUv + vec2<f32>(chromaShift, 0.0), vec2<f32>(0.0), vec2<f32>(1.0)), 0.0);
    let chromaB = textureSampleLevel(inputTex, linearSampler, clamp(shiftedUv - vec2<f32>(chromaShift, 0.0), vec2<f32>(0.0), vec2<f32>(1.0)), 0.0);
    var analogColor = vec3<f32>(
      mix(shifted.r, chromaA.r, analogAmount * 0.45),
      shifted.g,
      mix(shifted.b, chromaB.b, analogAmount * 0.55)
    );

    let bandPhase = abs(sin((f32(rowCell) * 1.71) + (frame * 0.061)));
    let band = burst * smoothstep(0.46, 0.96, bandPhase);
    let snow =
      (glitchHash(vec3<u32>(coord.x, coord.y, u.frame.z + 383u)) * 2.0 - 1.0) *
      analogAmount * (0.010 + band * 0.040);
    analogColor.r = cathodeSaturate(analogColor.r * (1.0 + band * analogAmount * 0.08) + snow);
    analogColor.g = cathodeSaturate(analogColor.g * (1.0 - band * analogAmount * 0.10) + snow);
    analogColor.b = cathodeSaturate(analogColor.b * (1.0 - band * analogAmount * 0.16) - snow);
    result = mix(result, analogColor, cathodeSaturate(analogAmount * 0.18 + burst * analogAmount * 0.68));
  }

  if (rfAmount > 0.0) {
    let diagonal =
      sin(pixelUv.x * frameSize.x * mix(0.08, 0.42, rfFrequency) +
          pixelUv.y * frameSize.y * mix(0.18, 0.68, rfFrequency) +
          frame * mix(0.025, 0.16, rfFrequency));
    let herringbone =
      sin((pixelUv.x * frameSize.x - pixelUv.y * frameSize.y) *
          mix(0.12, 0.55, rfFrequency) - frame * mix(0.040, 0.22, rfFrequency));
    let rf = (diagonal * 0.65 + herringbone * 0.35) * rfAmount;
    result.r = cathodeSaturate(result.r + rf * 0.030);
    result.g = cathodeSaturate(result.g + rf * 0.010);
    result.b = cathodeSaturate(result.b - rf * 0.026);
  }

  if (humAmount > 0.0) {
    let humPhase =
      sin(pixelUv.y * mix(9.0, 3.0, humRate) +
          frame * mix(0.018, 0.072, humRate));
    let bar = smoothstep(-0.18, 0.74, humPhase) * humAmount;
    let lift = (bar - humAmount * 0.38) * 0.105;
    result.r = cathodeSaturate(result.r + lift * 0.92);
    result.g = cathodeSaturate(result.g + lift);
    result.b = cathodeSaturate(result.b + lift * 0.82);
  }

  if (macroblockAmount > 0.0) {
    let blockSize = max(2u, u32(round(mix(4.0, 72.0, macroblockSize))));
    let block = coord / vec2<u32>(blockSize);
    let frameCell = u.frame.z / max(1u, 5u - u32(macroblockAmount * 4.0));
    let blockSeed = glitchHash(vec3<u32>(block.x, block.y + frameCell, 409u));
    if (blockSeed > mix(0.997, 0.70, macroblockAmount)) {
      let offsetSeedX = glitchHash(vec3<u32>(block.x + 11u, block.y, frameCell + 431u)) * 2.0 - 1.0;
      let offsetSeedY = glitchHash(vec3<u32>(block.x, block.y + 23u, frameCell + 457u)) * 2.0 - 1.0;
      let offset = vec2<f32>(
        round(offsetSeedX * f32(blockSize) * (0.75 + macroblockAmount * 2.5)) / frameSize.x,
        round(offsetSeedY * f32(blockSize) * macroblockAmount * 0.85) / frameSize.y
      );
      var blockColor = textureSampleLevel(inputTex, linearSampler, clamp(pixelUv + offset, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0).rgb;
      blockColor = quantizeColor(blockColor, mix(48.0, 5.0, macroblockAmount));
      let channelSeed = glitchHash(vec3<u32>(block.x, block.y, frameCell + 479u));
      if (channelSeed > 0.66) {
        blockColor = blockColor.gbr;
      } else if (channelSeed > 0.33) {
        blockColor = blockColor.rbg;
      }
      if ((coord.x % blockSize) < 2u || (coord.y % blockSize) < 2u) {
        blockColor *= 1.0 - macroblockAmount * 0.26;
      }
      result = mix(result, blockColor, cathodeSaturate(0.38 + macroblockAmount * 0.54));
    }
  }

  if (digitalDropoutDensity > 0.0) {
    let dropoutBlockSize = max(3u, u32(round(mix(4.0, 96.0, digitalDropoutSize))));
    let block = coord / vec2<u32>(dropoutBlockSize);
    let frameCell = u.frame.z / max(1u, u32(round(mix(8.0, 2.0, digitalDropoutDensity))));
    let dropoutSeed = glitchHash(vec3<u32>(block.x + 37u, block.y, frameCell + 659u));
    if (dropoutSeed > mix(0.998, 0.62, digitalDropoutDensity)) {
      let smearX =
        round((glitchHash(vec3<u32>(block.x, block.y + 41u, frameCell + 661u)) * 2.0 - 1.0) *
              f32(dropoutBlockSize) * (0.5 + digitalDropoutSize * 2.0));
      let smearY =
        round((glitchHash(vec3<u32>(block.x + 43u, block.y, frameCell + 673u)) * 2.0 - 1.0) *
              f32(dropoutBlockSize) * digitalDropoutSize * 0.45);
      var conceal = textureSampleLevel(
        inputTex,
        linearSampler,
        clamp(pixelUv + vec2<f32>(smearX / frameSize.x, smearY / frameSize.y),
              vec2<f32>(0.0),
              vec2<f32>(1.0)),
        0.0).rgb;
      let luma = dot(conceal, vec3<f32>(0.2126, 0.7152, 0.0722));
      conceal = mix(conceal, vec3<f32>(luma), 0.28 + digitalDropoutDensity * 0.34);
      if (historyBlend > 0.0 && u.flags0.z == 1u) {
        let historySample = textureSampleLevel(historyTex, linearSampler, clamp(pixelUv, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0).rgb;
        conceal = mix(conceal, historySample, historyBlend);
      }
      if ((coord.x % dropoutBlockSize) < 2u || (coord.y % dropoutBlockSize) < 2u) {
        conceal *= 1.0 - digitalDropoutDensity * 0.32;
      }
      result = mix(result, quantizeColor(conceal, mix(32.0, 4.0, digitalDropoutDensity)),
                   cathodeSaturate(0.42 + digitalDropoutDensity * 0.55));
    }
  }

  if (posterizeBits < 7.999 || digitalAmount > 0.0) {
    let effectiveBits = min(posterizeBits, mix(8.0, 4.0, digitalAmount));
    result = quantizeColor(result, pow(2.0, effectiveBits));
  }

  if (mosquitoAmount > 0.0) {
    let radius = max(1.0, round(mix(1.0, 5.0, mosquitoRadius)));
    let texel = vec2<f32>(radius / frameSize.x, radius / frameSize.y);
    let leftLuma = dot(textureSampleLevel(inputTex, linearSampler, clamp(pixelUv - vec2<f32>(texel.x, 0.0), vec2<f32>(0.0), vec2<f32>(1.0)), 0.0).rgb,
                       vec3<f32>(0.2126, 0.7152, 0.0722));
    let rightLuma = dot(textureSampleLevel(inputTex, linearSampler, clamp(pixelUv + vec2<f32>(texel.x, 0.0), vec2<f32>(0.0), vec2<f32>(1.0)), 0.0).rgb,
                        vec3<f32>(0.2126, 0.7152, 0.0722));
    let upLuma = dot(textureSampleLevel(inputTex, linearSampler, clamp(pixelUv - vec2<f32>(0.0, texel.y), vec2<f32>(0.0), vec2<f32>(1.0)), 0.0).rgb,
                     vec3<f32>(0.2126, 0.7152, 0.0722));
    let downLuma = dot(textureSampleLevel(inputTex, linearSampler, clamp(pixelUv + vec2<f32>(0.0, texel.y), vec2<f32>(0.0), vec2<f32>(1.0)), 0.0).rgb,
                       vec3<f32>(0.2126, 0.7152, 0.0722));
    let centerLuma = dot(color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    let edgeGate = smoothstep(0.08, 0.42, abs(leftLuma - rightLuma) + abs(upLuma - downLuma) + centerLuma * 0.02);
    let cell = max(1u, u32(radius));
    let buzz = glitchHash(vec3<u32>(coord.x / cell, coord.y / cell, u.frame.z + 601u)) * 2.0 - 1.0;
    let chromaBuzz = buzz * edgeGate * mosquitoAmount * (0.010 + mosquitoRadius * 0.035);
    result.r = cathodeSaturate(result.r + chromaBuzz * 0.65);
    result.g = cathodeSaturate(result.g - chromaBuzz * 0.18);
    result.b = cathodeSaturate(result.b - chromaBuzz * 0.82);
  }

  if (sparkleDensity > 0.0) {
    let sparkleCell = max(1u, u32(round(mix(9.0, 2.0, sparkleDensity))));
    let sparkleSeed = glitchHash(vec3<u32>(coord.x / sparkleCell, coord.y / sparkleCell, u.frame.z + 809u));
    let sparkleGate = select(0.0, 1.0, sparkleSeed > mix(0.9994, 0.965, sparkleDensity));
    if (sparkleGate > 0.0) {
      let pointSeed = glitchHash(vec3<u32>(coord.x + 17u, coord.y + 31u, u.frame.z + 811u));
      let sparkle = sparkleGate * smoothstep(0.20, 1.0, pointSeed) * sparkleDensity;
      let tintSeed = glitchHash(vec3<u32>(coord.x, coord.y, u.frame.z + 823u));
      let sparkleColor = mix(vec3<f32>(1.0), vec3<f32>(0.72, 0.92, 1.0), select(0.0, 1.0, tintSeed > 0.62));
      result = mix(result, sparkleColor, cathodeSaturate(sparkle * 0.88));
    }
  }

  return vec4<f32>(clamp(result, vec3<f32>(0.0), vec3<f32>(1.0)), color.a);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let frameSize = textureDimensions(inputTex);
  if (gid.x >= frameSize.x || gid.y >= frameSize.y) {
    return;
  }

  let xy = vec2<i32>(gid.xy);
  let pixelUv = (vec2<f32>(gid.xy) + vec2<f32>(0.5)) / vec2<f32>(f32(frameSize.x), f32(frameSize.y));
  let passthrough = textureLoad(inputTex, xy, 0);
  if (u.display0.x <= 0.0 || u.display2.z <= 0.0) {
    textureStore(outputTex, xy, applyOutputGlitches(pixelUv, gid.xy, passthrough));
    return;
  }

  let sourceUv = curvedUv(pixelUv, u.display2.x);
  let source = textureSampleLevel(inputTex, linearSampler, clamp(sourceUv, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0);
  let previous = textureSampleLevel(historyTex, linearSampler, clamp(sourceUv, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0);
  let beam = max(max(source.r, source.g), source.b);
  let persistence = select(0.0, u.display1.w, u.flags0.z == 1u);
  var persisted = mix(source.rgb, max(source.rgb, previous.rgb), persistence);
  let printThroughAmount = cathodeSaturate(u.glitch5.x);
  let printThroughOffset = cathodeSaturate(u.glitch5.y);
  let ghostTrailAmount = cathodeSaturate(u.glitch5.z);
  let ghostTrailDecay = cathodeSaturate(u.glitch5.w);
  if (u.flags0.z == 1u && printThroughAmount > 0.0) {
    let printOffset = mix(1.0, 24.0, printThroughOffset) / vec2<f32>(f32(max(frameSize.x, 1u)), f32(max(frameSize.y, 1u)));
    let printSample = textureSampleLevel(
      historyTex,
      linearSampler,
      clamp(sourceUv + vec2<f32>(printOffset.x, printOffset.y * 0.45), vec2<f32>(0.0), vec2<f32>(1.0)),
      0.0).rgb;
    let printLuma = dot(printSample, vec3<f32>(0.2126, 0.7152, 0.0722));
    persisted = mix(persisted, mix(printSample, vec3<f32>(printLuma), 0.35), printThroughAmount * 0.20);
  }
  if (u.flags0.z == 1u && ghostTrailAmount > 0.0) {
    let trailMix = ghostTrailAmount * mix(0.12, 0.55, ghostTrailDecay);
    persisted = mix(persisted, max(persisted, previous.rgb), trailMix);
  }
  let scanline = scanlineFactor(pixelUv);
  let triad = mix(vec3<f32>(1.0), maskFor(u.flags0.x, gid.xy, u.display2.y), u.display0.z);
  let maskWeight = sampleMaskWeight(pixelUv);
  let edge = 1.0 - cathodeSaturate(dot(pixelUv * 2.0 - 1.0, pixelUv * 2.0 - 1.0) * u.display2.x * 0.42);
  let beamGain = 1.0 + beam * mix(0.12, 0.85, cathodeSaturate(u.display0.y));
  let edgeFloor = mix(1.0, 0.42, cathodeSaturate(u.display2.x));
  let bloomThreshold = mix(0.82, 0.52, cathodeSaturate(u.display0.w));
  let bloom = max(beam - bloomThreshold, 0.0) * u.display0.w * 0.85;
  let bloomTint = clamp3(vec3<f32>(1.0, 0.92, 0.86) + u.personality2.xyz, 0.4, 1.6);
  let shaped =
    persisted * triad * beamGain * scanline * max(edge, edgeFloor) * maskWeight +
      (bloomTint * bloom);
  let personalityShaped = applyLookPersonality(shaped, beam);
  let phosphorShaped = applyPhosphorMode(u.flags0.w, personalityShaped);
  let result = applyOutputGlitches(pixelUv, gid.xy, vec4<f32>(
    mix(source.rgb, phosphorShaped, cathodeSaturate(u.display0.x)),
    source.a
  ));

  textureStore(outputTex, vec2<i32>(gid.xy), result);
}
