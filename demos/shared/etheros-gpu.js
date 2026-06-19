/*
 * SIGNAL RACK — etheros-gpu  (demos/shared/etheros-gpu.js)
 * -------------------------------------------------------------------------
 * Runs the REAL Etheros field engine in the browser via WebGPU — the canonical
 * `primary_slice.wgsl` compute shader (vendored from the Etheros snapshot,
 * shaders/), not a CPU re-derivation. This is the in-browser sibling of the
 * Etheros web lab's engine-bridge.mjs: it
 *   1. parses the std140 `NoiseParams` layout straight from the WGSL,
 *   2. maps a recipe → NoiseParams with the same math as
 *      core/etheros_runtime_config.cpp::BuildFieldShaderParams
 *      (ported verbatim from web/ethera-lab/public/engine-bridge.mjs), and
 *   3. dispatches the compute pass → storage texture → palette blit to canvas.
 *
 *   EtherosGPU.createSliceRenderer(canvas, { shaderBase }) -> Promise<renderer|null>
 *     renderer.render(recipe, timeSeconds)   // draws one frame
 *
 * Returns null (so callers can fall back to etheros-lite CPU) when WebGPU is
 * unavailable. The engine emits a scalar field [0,1]; the palette is applied in
 * the blit (a presentation choice, kept out of the field math).
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EtherosGPU = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---- std140 NoiseParams layout (parsed from the WGSL struct) -------------
  var TYPE_INFO = {
    "f32": { size: 4, align: 4 }, "i32": { size: 4, align: 4 }, "u32": { size: 4, align: 4 },
    "vec2<f32>": { size: 8, align: 8 }, "vec3<f32>": { size: 12, align: 16 }, "vec4<f32>": { size: 16, align: 16 }
  };
  function alignUp(o, a) { return Math.ceil(o / a) * a; }

  function parseNoiseParamsLayout(src) {
    var match = src.match(/struct\s+NoiseParams\s*\{([\s\S]*?)\}/);
    if (!match) throw new Error("NoiseParams struct not found");
    var fields = [], offset = 0, lines = match[1].split("\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\/\/.*$/, "").trim().replace(/,$/, "");
      if (!line) continue;
      var fm = line.match(/^(\w+)\s*:\s*(.+)$/);
      if (!fm) continue;
      var name = fm[1], type = fm[2].replace(/\s+/g, ""), info = TYPE_INFO[type];
      if (!info) throw new Error("unknown field type for " + name + ": " + type);
      offset = alignUp(offset, info.align);
      fields.push({ name: name, type: type, offset: offset, size: info.size });
      offset += info.size;
    }
    return { fields: fields, size: alignUp(offset, 16) };
  }

  function packNoiseParams(layout, values) {
    var buffer = new ArrayBuffer(layout.size), view = new DataView(buffer);
    layout.fields.forEach(function (field) {
      var value = values[field.name];
      if (value === undefined) return;
      function writeAt(byteOffset, v) {
        if (field.type === "i32") view.setInt32(byteOffset, v | 0, true);
        else if (field.type === "u32") view.setUint32(byteOffset, v >>> 0, true);
        else view.setFloat32(byteOffset, v, true);
      }
      if (Array.isArray(value)) value.forEach(function (v, i) { writeAt(field.offset + i * 4, v); });
      else writeAt(field.offset, value);
    });
    return buffer;
  }

  // ---- recipe → NoiseParams (verbatim port of engine-bridge.mjs) -----------
  var clamp01 = function (x) { return Math.max(0, Math.min(1, x)); };
  var clampN = function (x, lo, hi) { return Math.max(lo, Math.min(hi, x)); };
  function engineWarpStrength(amount) { var v = Math.max(0, Number(amount) || 0); return clampN(v * 0.16, 0, 0.55); }
  function engineWarpScale(scale) { var v = Math.max(0.05, Number(scale) || 0.9); return clampN(Math.pow(v, 1.45) * 1.15, 0.05, 8); }
  function engineFlowStrength(strength) { var v = Math.max(0, Number(strength) || 0); return clampN(Math.pow(v, 2.0) * 0.34, 0, 0.85); }
  function engineCurlScale(scale) { var v = Math.max(0.05, Number(scale) || 1); var r = v < 1 ? Math.pow(v, 1.08) : 1 + (v - 1) * 1.25; return clampN(r, 0.05, 4.0); }

  var PRIMITIVE_CODE = { simplex: 0, perlin: 1, value: 2, worley: 3, phasor: 4, valueCubic: 5, cellularEdge: 6, chladni: 7, bubble: 8 };
  var FRACTAL_CODE = { fbm: 0, ridged: 1, billow: 2, turbulence: 3 };
  var MOTION_CODE = { still: 0, static: 0, evolve: 1, flow: 2, flowStretch: 3, flowAnisotropic: 3 };
  var WARP_CODE = { off: 0, none: 0, noiseOffset: 1, directional: 2, directionalOffset: 2, organic: 1 };
  var OUTPUT_CODE = { scalar: 0, scalarOccupancyAlpha: 1, value: 2, thresholdGate: 3, detail: 4, energy: 5, flow: 6, gradient: 7, pulse: 8, crossUp: 9, crossDown: 10, delta: 11, speed: 12, acceleration: 13 };
  var INSPECTION_CODE = { beauty: 0, density: 1, detail: 1, flow: 2, edge: 2, light: 3, threshold: 3, energy: 3 };
  var DRIVER_SOURCE_SEED = { none: 0, radialAlpha: 11, textPlate: 19, diagonalWipe: 23, impactRing: 31, punchVector: 37, radialBurst: 41, swirl: 43, leftToRight: 47, grain: 53, scanBands: 59, checker: 61, plasma: 67 };
  var SECONDARY_PRIMITIVE_BY_SOURCE = { grain: 2, scanBands: 6, checker: 6, plasma: 0, impactRing: 8, radialAlpha: 3, textPlate: 5, diagonalWipe: 1, punchVector: 7, radialBurst: 8, swirl: 4, leftToRight: 1 };
  var CENTERED_PRIMITIVES = { 0: 1, 1: 1, 2: 1, 4: 1, 5: 1, 7: 1 };
  var CENTERED_VOLUME_FIELD_LIFT = 0.45;

  function hexToRgb(hex) { var m = /^#?([0-9a-fA-F]{6})$/.exec(hex || ""); if (!m) return [0.5, 0.5, 0.5]; var n = parseInt(m[1], 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
  function driverSourceSeed(source) { return DRIVER_SOURCE_SEED[source] || 0; }
  function driverEnabled(driver) { return Boolean(driver && driver.enabled) && ((driver && driver.source) || "none") !== "none"; }

  function recipeToNoiseParams(recipe, opts) {
    var time = (opts && opts.time) || 0;
    var s = recipe.structure || {}, sh = recipe.shape || {}, m = recipe.motion || {};
    var w = recipe.warp || {}, v = recipe.volume || {}, o = recipe.output || {};
    var q = recipe.quality || {}, insp = recipe.inspection || {}, bands = s.bands || {};
    var isBubbleVolume = v.enabled && s.primitive === "bubble";
    var isSliceRender = !v.enabled;
    var bubbleVolumeTextureDamp = isBubbleVolume ? 0.7 : 1;
    var ff = recipe.flowField || {};
    var drivers = recipe.drivers || {};
    var influence = drivers.influence || {}, vector = drivers.vector || {}, entropy = drivers.entropy || {};
    var influenceActive = driverEnabled(influence), vectorActive = driverEnabled(vector), entropyActive = driverEnabled(entropy);
    var influenceStrength = influenceActive ? clamp01((influence.strength || 0) * (influence.depth == null ? 1 : influence.depth)) : 0;
    var vectorStrength = vectorActive ? clamp01((vector.strength || 0) / 6) : 0;
    var entropyStrength = entropyActive ? clamp01(entropy.strength || 0) : 0;
    var secondaryBite = entropyActive ? clampN(entropy.bite == null ? 0.7 : entropy.bite, 0, 2) : 0;
    var secondaryBiteActivity = entropyStrength * secondaryBite;
    var secondaryBiteFine = entropyActive ? entropyStrength * clampN((secondaryBite - 0.35) / 1.65, 0, 1.2) : 0;
    var secondaryBiteHigh = entropyActive ? entropyStrength * clampN((secondaryBite - 0.7) / 1.3, 0, 1) : 0;
    var vectorTurbulence = clampN(vector.turbulence == null ? 0.35 : vector.turbulence, 0, 2);
    var vectorDistortion = clampN(vector.distortion == null ? 1 : vector.distortion, 0, 4);
    var entropyScale = entropyActive ? clampN(entropy.scale == null ? 1.15 : entropy.scale, 0.1, 8) : 0;
    var entropyTemporal = clamp01(entropy.temporal == null ? 0.42 : entropy.temporal);
    var driverSeed = driverSourceSeed(influence.source) * 101 + driverSourceSeed(vector.source) * 211 + driverSourceSeed(entropy.source) * 307;
    var directCurlStrength = Math.max(0, ff.curlStrength || 0);
    var directFlowScale = isFinite(Number(ff.scale)) ? engineCurlScale(ff.scale) : 1;
    var directAdvectionSpeed = isFinite(Number(ff.advectionSpeed)) ? Math.max(0, Number(ff.advectionSpeed)) : 0;
    var driverCurlStrength = vectorStrength * (1.1 + vectorTurbulence * 0.38) + entropyStrength * 1.45 + influenceStrength * 0.24;
    var derivedCurlStrength = clampN(Math.max(directCurlStrength * 1.35, driverCurlStrength), 0, 2.5);
    var driverAdvectionSpeed = driverCurlStrength * (0.28 + vectorDistortion * 0.04 + entropyTemporal * 0.28);
    var directAdvectionCurve = Math.pow(directAdvectionSpeed, 1.55) * 1.7;
    var derivedAdvectionSpeed = clampN(Math.max(directAdvectionCurve, driverAdvectionSpeed), 0, 2.2);
    var derivedFlowScale = Math.max(directFlowScale, entropyScale, vectorActive ? 0.8 + vectorTurbulence * 0.75 : 0);
    var composeAmountBase = entropyStrength * 1.05 + influenceStrength * 0.68 + vectorStrength * 0.72;
    var composeBitePressure = entropyActive ? (0.78 + secondaryBite * 0.25) : 1;
    var composeAmount = clamp01(composeAmountBase * composeBitePressure);
    var composeMode = composeAmount <= 0.001 ? 0 : influenceActive && influence.mode === "density" ? 3 : entropyActive && entropy.target === "threshold" ? 1 : 2;
    var secondarySource = entropyActive ? entropy.source : influenceActive ? influence.source : vectorActive ? vector.source : "plasma";
    var secondaryFieldScale = entropyActive ? entropyScale : vectorActive ? clampN(1.2 + vectorTurbulence * 1.4 + vectorDistortion * 0.15, 0.4, 5.5) : influenceActive ? 1.4 + influenceStrength * 1.2 : 1.15;
    var edgePressure = Math.max(0, (s.edgeDefinition == null ? 1 : s.edgeDefinition) - 1);
    var microPressure = Math.max(0, (s.microContrast == null ? 1 : s.microContrast) - 1);
    var detailPressure = clampN((s.detailScale == null ? 1 : s.detailScale) / Math.max(s.baseScale == null ? 1 : s.baseScale, 0.1), 0, 8);
    var lowBandAmount = (bands.low && bands.low.amount != null) ? bands.low.amount : 1;
    var midBandAmount = (bands.mid && bands.mid.amount != null) ? bands.mid.amount : 0.6;
    var highBandAmount = (bands.high && bands.high.amount != null) ? bands.high.amount : 0.2;
    var rawLacunarity = clampN(s.lacunarity == null ? 2 : s.lacunarity, 1.2, 3.55);
    var engineLacunarity = clampN(1.3 + (rawLacunarity - 1.2) * 0.45, 1.3, 2.45);
    var roughnessDrive = clampN(s.roughness == null ? 0.5 : s.roughness, 0, 2);
    var roughnessPressure = clampN(roughnessDrive / 2, 0, 1);
    var roughHighPressure = clampN((roughnessDrive - 0.55) / 1.45, 0, 1);
    var roughDetailLift = roughnessPressure * roughnessPressure;
    var roughLocalBite = Math.pow(roughHighPressure, 0.9);
    var detailLocalPressure = clampN(Math.max(0, detailPressure - 3.2) / 3.2, 0, 1.5);
    var bMidR = (bands.mid && bands.mid.roughness != null) ? bands.mid.roughness : 0.5;
    var bHighR = (bands.high && bands.high.roughness != null) ? bands.high.roughness : 0.7;
    var bHighS = (bands.high && bands.high.scale != null) ? bands.high.scale : 1.75;
    var midTexturePressure = clampN((bMidR - 0.5) / 1.2, 0, 1.3);
    var highTexturePressure = clampN((bHighR - 0.7) / 1.3, 0, 1.4);
    var highFrequencyPressure = clampN((bHighS - 1.75) / 3.05, 0, 1.15);
    var highFrequencyLowPressure = clampN((1.75 - bHighS) / 1.0, 0, 0.9);
    var roughMidBandAmount = clampN(midBandAmount + roughLocalBite * 0.14, 0, 3);
    var roughHighBandAmount = clampN(highBandAmount * (1 + roughLocalBite * 0.58 + highTexturePressure * 0.14 + highFrequencyPressure * 0.32 + detailLocalPressure * 0.34) + roughLocalBite * 0.68 + highFrequencyPressure * 0.5 + detailLocalPressure * 0.18, 0, 3);
    var structureBite = clampN(edgePressure * 0.25 + microPressure * 0.1 + Math.max(0, midBandAmount - 0.5) * 0.12 + Math.max(0, highBandAmount - 0.5) * 0.22 + highFrequencyPressure * 0.18, 0, 2.5);
    var softenedFlowStrength = engineFlowStrength(m.flowStrength || 0);
    var rawEvolutionRate = m.evolutionRate || 0;
    var softenedEvolutionRate = rawEvolutionRate * 2.0;
    var softenedAnisotropy = clampN((m.anisotropy || 0) * 0.48, 0, 1.45);
    var softenedStreakLength = clampN((m.streakLength == null ? 0.3 : m.streakLength) * 0.55, 0.05, 1.8);
    var baseMotionMode = MOTION_CODE[m.mode] || 0;
    var resolvedMotionMode = softenedFlowStrength >= 0.65 && baseMotionMode === 0 ? 2 : baseMotionMode;
    var effectiveFlowStrength = resolvedMotionMode === 0 ? 0 : softenedFlowStrength;
    var pal = o.palette || {}, tone = o.tone || {};
    var displayBrightness = clampN(tone.brightness == null ? 0 : tone.brightness, -0.5, 0.75);
    var displayContrast = clampN(tone.contrast == null ? 1 : tone.contrast, 0.25, 2.5);
    var displayBrightnessPressure = displayBrightness - 0.05;
    var displayContrastPressure = displayContrast - 1.1;
    var displayFieldBrightness = displayBrightnessPressure * 0.24;
    var displayFieldContrast = clampN(1 + displayContrastPressure * 0.5, 0.54, 1.82);
    var displayDensityScale = clampN(1 + displayContrastPressure * 0.62, 0.48, 2.05);
    var displayDensityBias = displayBrightnessPressure * 0.68 - Math.max(0, displayContrastPressure) * 0.045 + Math.min(0, displayContrastPressure) * 0.04;
    var dens = v.density || {}, ceil = v.ceiling || {};
    var ceilingBreakup = clamp01(ceil.breakup == null ? 0.2 : ceil.breakup);
    var densityBody = clamp01(dens.body == null ? 0.6 : dens.body);
    var densityCoverage = clamp01(dens.coverage == null ? (dens.body == null ? 0.6 : dens.body) : dens.coverage);
    var densityErosion = clamp01(dens.erosion == null ? 0.4 : dens.erosion);
    var densityScaleTrim = clampN(dens.scale == null ? 1 : dens.scale, 0.25, 2.5);
    var densityBiasTrim = clampN(dens.bias == null ? 0 : dens.bias, -0.5, 0.5);
    var heightFalloff = dens.heightFalloff == null ? 0.5 : dens.heightFalloff;
    var heightShapeBias = (heightFalloff - 0.5) + (heightFalloff - 0.685) * 0.18;
    var coverageOffset = densityCoverage - 0.62;
    var coverageDensityBias = (densityCoverage - 0.5) * 0.26 + coverageOffset * 0.49;
    var densityCarve = densityErosion * 0.34 + ceilingBreakup * 0.26 + influenceStrength * 0.06;
    var driverDensityActivity = composeAmount * (entropyActive || influenceActive || vectorActive ? 1 : 0);
    var shapeContrast = sh.contrast == null ? 1 : sh.contrast;
    var extractContrastLift = clampN(shapeContrast - 1.08, 0, 1.25);
    var extractContrastDamp = clampN(0.92 - shapeContrast, 0, 0.8);
    var primCode = PRIMITIVE_CODE[s.primitive] || 0;
    var fractalCode = FRACTAL_CODE[s.fractalMode] || 0;
    var turbLift = 0;
    if (v.enabled && CENTERED_PRIMITIVES[primCode] && (fractalCode === 0 || fractalCode === 2)) { fractalCode = 3; turbLift = CENTERED_VOLUME_FIELD_LIFT; }
    var orient = v.orientation || {};
    var cy = Math.cos(orient.yaw || 0), sy = Math.sin(orient.yaw || 0);
    var cp = Math.cos(orient.pitch || 0), sp = Math.sin(orient.pitch || 0);
    var camU = [cy, 0, -sy], camV = [sy * sp, cp, cy * sp];
    var camDistance = orient.distance == null ? 1 : orient.distance;
    var panX = orient.panX || 0, panY = orient.panY || 0;
    var coverageDensityScale = clampN(0.65 + densityCoverage * 0.7 + coverageOffset * 0.75, 0.35, 1.55);
    var fieldBrightness = (sh.bias || 0) * 0.5 + turbLift + extractContrastLift * 0.1 - extractContrastDamp * 0.12 + displayFieldBrightness;
    var fieldContrast = (sh.contrast == null ? 1 : sh.contrast) * displayFieldContrast * (1 + edgePressure * 0.035 + microPressure * 0.045 + roughnessPressure * 0.035 + structureBite * 0.026);
    var thresholdLow = clampN((sh.thresholdLow == null ? 0.3 : sh.thresholdLow) + edgePressure * 0.035 - extractContrastLift * 0.035 + extractContrastDamp * 0.025, 0, 0.96);
    var thresholdHigh = clampN((sh.thresholdHigh == null ? 0.72 : sh.thresholdHigh) - edgePressure * 0.008 - microPressure * 0.004 - structureBite * 0.004 - extractContrastLift * 0.13 + extractContrastDamp * 0.16, 0.04, 1);
    var sliceThresholdSpread = isSliceRender ? 0.18 : 0;
    var sliceThresholdLift = isSliceRender ? 0.12 + Math.max(0, displayContrastPressure) * 0.035 : 0;
    var bandHigh = roughHighBandAmount * bubbleVolumeTextureDamp * (1 - highFrequencyLowPressure * 0.48);
    var bMidS = (bands.mid && bands.mid.scale != null) ? bands.mid.scale : 1;
    var bandMidScale = clampN(bMidS * (1 + detailPressure * 0.24 + edgePressure * 0.08 + roughLocalBite * 0.16 + roughMidBandAmount * 0.2 + midTexturePressure * 0.36 + structureBite * 0.11), 0.05, 12);
    var bandHighScale = clampN(bHighS * (1 + detailPressure * 0.42 + edgePressure * 0.08 + microPressure * 0.12 + roughLocalBite * 0.2 + roughHighBandAmount * 0.18 + highTexturePressure * 0.66 + structureBite * 0.15) * bubbleVolumeTextureDamp, 0.05, 12);
    var detailScale = clampN((s.detailScale == null ? 1 : s.detailScale) * (1 + roughLocalBite * 0.45 + highFrequencyPressure * 0.65 + structureBite * 0.14) * (isBubbleVolume ? 0.82 : 1), 0.0001, 14);
    var mappedRoughness = clampN((s.roughness == null ? 0.5 : s.roughness) * (1 + structureBite * 0.24 + detailLocalPressure * 0.2) * (isBubbleVolume ? 0.86 : 1), 0, 3);
    var bLowS = (bands.low && bands.low.scale != null) ? bands.low.scale : 0.75;
    var bLowR = (bands.low && bands.low.roughness != null) ? bands.low.roughness : 0.35;
    return {
      seed: (recipe.variation && recipe.variation.seed != null) ? recipe.variation.seed : (recipe.seed == null ? 42 : recipe.seed),
      scale: (s.baseScale == null ? 2 : s.baseScale) * camDistance,
      octaves: Math.round(clampN((s.octaveCount == null ? 4 : s.octaveCount) + roughDetailLift * 2.6 - (isSliceRender ? 3 : 0), 1, isSliceRender ? 7 : 13)),
      lacunarity: engineLacunarity,
      gain: clampN((s.gain == null ? 0.5 : s.gain) * (1 + roughDetailLift * 0.18) * (isSliceRender ? 0.82 : 1), 0.05, 0.95),
      offset: [panX, panY, 0],
      phase_offset: ((recipe.variation && recipe.variation.phaseOffset) || 0) + rawEvolutionRate * 0.35,
      absolute: sh.absolute ? 1 : 0,
      ridged: s.fractalMode === "ridged" ? 1 : 0,
      invert: sh.invert ? 1 : 0,
      brightness: fieldBrightness + (isSliceRender ? -0.12 : 0),
      contrast: fieldContrast * (isSliceRender ? 0.76 : 1),
      warp_strength: w.enabled ? engineWarpStrength(w.amount || 0) : 0,
      threshold_low: clampN(thresholdLow + sliceThresholdLift, 0, 0.96),
      threshold_high: clampN(thresholdHigh + sliceThresholdLift + sliceThresholdSpread, 0.04, 1),
      clamp_low: sh.clampLow == null ? 0 : sh.clampLow, clamp_high: sh.clampHigh == null ? 1 : sh.clampHigh,
      fractal_mode: fractalCode,
      warp_scale: engineWarpScale(w.scale == null ? 0.9 : w.scale),
      flow_direction: m.flowDirection || [1, 0],
      flow_strength: effectiveFlowStrength,
      band_low: lowBandAmount, band_mid: roughMidBandAmount, band_high: bandHigh * (isSliceRender ? 0.3 : 1),
      band_low_scale: bLowS * (1 + detailPressure * 0.1 + structureBite * 0.12),
      band_mid_scale: bandMidScale * (isSliceRender ? 0.86 : 1),
      band_high_scale: bandHighScale * (isSliceRender ? 0.5 : 1),
      band_low_roughness: clampN(bLowR * (0.45 + roughnessDrive * 0.5 + edgePressure * 0.08 + structureBite * 0.08), 0.02, 2),
      band_mid_roughness: clampN(bMidR * (0.45 + roughnessDrive * 0.66 + detailPressure * 0.07 + detailLocalPressure * 0.18 + edgePressure * 0.08 + structureBite * 0.1), 0.02, 2),
      band_high_roughness: clampN(bHighR * (0.42 + roughnessDrive * 0.9 + detailPressure * 0.16 + detailLocalPressure * 0.46 + highFrequencyPressure * 0.38 + edgePressure * 0.02 + microPressure * 0.03 + structureBite * 0.09) * bubbleVolumeTextureDamp * (1 - highFrequencyLowPressure * 0.62), 0.02, 2),
      warp_type: WARP_CODE[w.warpType] || 0,
      secondary_seed: (((w.secondarySeed == null ? 17 : w.secondarySeed) + driverSeed * 9973) >>> 0),
      motion_mode: resolvedMotionMode,
      evolution_rate: softenedEvolutionRate,
      anisotropy: softenedAnisotropy,
      streak_length: softenedStreakLength,
      flow_field_mode: (ff.mode || 0) === 1 || derivedCurlStrength > 0.001 ? 1 : 0,
      flow_field_advection_speed: derivedAdvectionSpeed,
      flow_field_curl_strength: derivedCurlStrength,
      flow_field_scale: Math.max(0.05, derivedFlowScale),
      flow_field_seed_offset: (ff.seedOffset || 0) + driverSeed,
      flow_field_evolution_rate: Math.max(directAdvectionSpeed * 0.18, entropyTemporal * entropyStrength * 0.8 + (vector.pulse == null ? 0.25 : vector.pulse) * vectorStrength * 0.35),
      flow_field_link_to_master_evolution: 0,
      primitive_type: primCode,
      normalize_output: (o.normalize != null ? o.normalize : q.normalizedOutput) ? 1 : 0,
      range_min: o.rangeMin == null ? 0 : o.rangeMin, range_max: o.rangeMax == null ? 1 : o.rangeMax,
      shape_gain: Math.max(0.0001, sh.gain == null ? 1 : sh.gain),
      detail_scale: detailScale * (isSliceRender ? 0.24 : 1),
      roughness: mappedRoughness * (isSliceRender ? 0.5 : 1),
      amplitude: Math.max(0, s.amplitude == null ? 1 : s.amplitude),
      output_type: OUTPUT_CODE[o.outputType] || 0,
      variation: clamp01((recipe.variation && recipe.variation.amount) == null ? 0.3 : recipe.variation.amount),
      coherence: 0.5,
      tile_x: o.tileX ? 1 : 0, tile_y: o.tileY ? 1 : 0,
      temporal_stability: clamp01(m.temporalStability == null ? (q.temporalStability == null ? 0.9 : q.temporalStability) : m.temporalStability),
      use_camera_plane: 1,
      camera_plane_origin: [0, 0, 0], camera_plane_u: camU, camera_plane_v: camV,
      volume_enabled: v.enabled ? 1 : 0,
      inspection_mode: INSPECTION_CODE[insp.mode] || 0, inspection_gain: insp.gain == null ? 1 : insp.gain,
      time: time * (m.timeScale == null ? 1 : m.timeScale)
    };
  }

  // ---- palette blit: scalar field [0,1] -> a vivid multi-stop colormap -----
  // disp = vec4(paletteIndex, gain, bias, _). The field comes out of the slice
  // path low + narrow, so we stretch (gain/bias) then run a 6-stop ramp so it
  // pops instead of sitting dark. Palettes: 0 ember, 1 signal, 2 ice.
  var BLIT_WGSL = [
    "@group(0) @binding(0) var samp: sampler;",
    "@group(0) @binding(1) var tex: texture_2d<f32>;",
    "@group(0) @binding(2) var<uniform> disp: vec4<f32>;",
    "struct VOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };",
    "@vertex fn vs(@builtin(vertex_index) i: u32) -> VOut {",
    "  var ps = array<vec2<f32>, 3>(vec2<f32>(-1.0,-1.0), vec2<f32>(3.0,-1.0), vec2<f32>(-1.0,3.0));",
    "  let p = ps[i]; var o: VOut;",
    "  o.pos = vec4<f32>(p, 0.0, 1.0);",
    "  o.uv = vec2<f32>(p.x*0.5+0.5, 0.5-p.y*0.5);",
    "  return o;",
    "}",
    // piecewise ramp helper over 6 evenly-spaced stops
    "fn ramp6(v: f32, c0: vec3<f32>, c1: vec3<f32>, c2: vec3<f32>, c3: vec3<f32>, c4: vec3<f32>, c5: vec3<f32>) -> vec3<f32> {",
    "  let s = clamp(v, 0.0, 1.0) * 5.0;",
    "  let i = floor(s); let f = s - i;",
    "  if (i < 1.0) { return mix(c0, c1, f); }",
    "  if (i < 2.0) { return mix(c1, c2, f); }",
    "  if (i < 3.0) { return mix(c2, c3, f); }",
    "  if (i < 4.0) { return mix(c3, c4, f); }",
    "  return mix(c4, c5, f);",
    "}",
    "fn colormap(p: u32, v: f32) -> vec3<f32> {",
    "  if (p == 1u) {", // signal: deep teal -> green -> amber -> hot
    "    return ramp6(v, vec3<f32>(0.012,0.035,0.055), vec3<f32>(0.03,0.18,0.22), vec3<f32>(0.10,0.42,0.36),",
    "      vec3<f32>(0.49,0.78,0.30), vec3<f32>(0.91,0.66,0.16), vec3<f32>(1.0,0.97,0.82));",
    "  }",
    "  if (p == 2u) {", // ice: indigo -> blue -> cyan -> white
    "    return ramp6(v, vec3<f32>(0.02,0.02,0.08), vec3<f32>(0.06,0.10,0.34), vec3<f32>(0.10,0.32,0.66),",
    "      vec3<f32>(0.20,0.62,0.85), vec3<f32>(0.58,0.86,0.94), vec3<f32>(0.96,0.99,1.0));",
    "  }",
    // ember (default): indigo -> violet -> magenta -> orange -> amber -> white
    "  return ramp6(v, vec3<f32>(0.02,0.01,0.09), vec3<f32>(0.22,0.04,0.30), vec3<f32>(0.62,0.10,0.36),",
    "    vec3<f32>(0.91,0.34,0.18), vec3<f32>(0.98,0.72,0.20), vec3<f32>(1.0,0.96,0.80));",
    "}",
    "@fragment fn fs(in: VOut) -> @location(0) vec4<f32> {",
    "  let raw = textureSample(tex, samp, in.uv).r;",
    "  var v = clamp((raw - disp.z) * disp.y, 0.0, 1.0);",
    "  v = v * v * (3.0 - 2.0 * v);",        // smoothstep for contrast pop
    "  return vec4<f32>(colormap(u32(disp.x + 0.5), v), 1.0);",
    "}"
  ].join("\n");

  function createSliceRenderer(canvas, options) {
    options = options || {};
    var shaderBase = options.shaderBase || "../shared/etheros/";
    var maxDim = options.maxDim || 576;   // cap compute resolution; blit upscales
    if (typeof navigator === "undefined" || !navigator.gpu) return Promise.resolve(null);
    return navigator.gpu.requestAdapter().then(function (adapter) {
      if (!adapter) return null;
      return adapter.requestDevice().then(function (device) {
        return fetch(shaderBase + "primary_slice.wgsl").then(function (r) {
          if (!r.ok) throw new Error("slice shader fetch failed: " + r.status);
          return r.text();
        }).then(function (sliceSource) {
          var format = navigator.gpu.getPreferredCanvasFormat();
          var context = canvas.getContext("webgpu");
          if (!context) return null;
          context.configure({ device: device, format: format, alphaMode: "opaque" });

          var layout = parseNoiseParamsLayout(sliceSource);
          var computePipeline = device.createComputePipeline({
            layout: "auto",
            compute: { module: device.createShaderModule({ code: sliceSource }), entryPoint: "main" }
          });
          var blitModule = device.createShaderModule({ code: BLIT_WGSL });
          var blitPipeline = device.createRenderPipeline({
            layout: "auto",
            vertex: { module: blitModule, entryPoint: "vs" },
            fragment: { module: blitModule, entryPoint: "fs", targets: [{ format: format }] },
            primitive: { topology: "triangle-list" }
          });
          var sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
          var uniformBuffer = device.createBuffer({ size: layout.size, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
          var dispBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

          var tex = null, texW = 0, texH = 0, lost = false;
          // a crashed/lost device must not keep dispatching (mobile crash loop)
          if (device.lost) device.lost.then(function () { lost = true; });
          function ensureTexture(w, h) {
            if (tex && texW === w && texH === h) return;
            if (tex) tex.destroy();
            tex = device.createTexture({ size: { width: w, height: h }, format: "rgba8unorm", usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING });
            texW = w; texH = h;
          }

          function render(recipe, time, display) {
            if (lost) return;
            // Render the compute at a capped resolution (heavy fractal shader at
            // full device-pixel size crashes mobile GPUs); the blit upscales it.
            var cw = Math.max(1, canvas.width), ch = Math.max(1, canvas.height);
            var sc = Math.min(1, maxDim / Math.max(cw, ch));
            var w = Math.max(1, Math.round(cw * sc)), h = Math.max(1, Math.round(ch * sc));
            ensureTexture(w, h);
            device.queue.writeBuffer(uniformBuffer, 0, packNoiseParams(layout, recipeToNoiseParams(recipe, { time: time || 0 })));
            display = display || {};
            device.queue.writeBuffer(dispBuffer, 0, new Float32Array([
              display.palette || 0, display.gain == null ? 2.4 : display.gain, display.bias == null ? 0.04 : display.bias, 0 ]));
            var view = tex.createView();
            var computeBind = device.createBindGroup({
              layout: computePipeline.getBindGroupLayout(0),
              entries: [{ binding: 0, resource: { buffer: uniformBuffer } }, { binding: 1, resource: view }]
            });
            var blitBind = device.createBindGroup({
              layout: blitPipeline.getBindGroupLayout(0),
              entries: [{ binding: 0, resource: sampler }, { binding: 1, resource: view }, { binding: 2, resource: { buffer: dispBuffer } }]
            });
            var enc = device.createCommandEncoder();
            var cpass = enc.beginComputePass();
            cpass.setPipeline(computePipeline);
            cpass.setBindGroup(0, computeBind);
            cpass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8));
            cpass.end();
            var rpass = enc.beginRenderPass({
              colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }]
            });
            rpass.setPipeline(blitPipeline);
            rpass.setBindGroup(0, blitBind);
            rpass.draw(3);
            rpass.end();
            device.queue.submit([enc.finish()]);
          }

          return { label: "Etheros WebGPU", render: render, layout: layout, recipeToNoiseParams: recipeToNoiseParams };
        });
      });
    }).catch(function (e) { if (typeof console !== "undefined") console.warn("EtherosGPU init failed:", e); return null; });
  }

  return {
    createSliceRenderer: createSliceRenderer,
    recipeToNoiseParams: recipeToNoiseParams,
    parseNoiseParamsLayout: parseNoiseParamsLayout,
    packNoiseParams: packNoiseParams
  };
});
