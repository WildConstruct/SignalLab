/*
 * FIELD BRIDGE — Signal Rack × Etheros  (demos/field-bridge/render.js)
 * -------------------------------------------------------------------------
 * Two engines, one look: the Signal Rack driver's `n` ROUTES onto an Etheros
 * recipe parameter (warp.amount / motion.flowStrength / shape.thresholdLow /
 * structure.baseScale) — a signal-driven field.
 *
 * The field is rendered by the REAL Etheros engine running in the browser via
 * WebGPU — the canonical `primary_slice.wgsl` compute shader (etheros-gpu.js),
 * the same WGSL the plugin/native runtime uses. When WebGPU is unavailable the
 * host falls back to the etheros-lite CPU mirror (render2D below). Both consume
 * the same recipe, so the bridge composition is identical on either path.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var EL = root.EtherosLite, GPU = root.EtherosGPU;

  // Build an Etheros recipe from the control state, then route the signal `n`
  // onto one recipe parameter. This is the bridge — shared by GPU and CPU paths.
  var TEMPO = 0.8;                              // field tempo vs wall time
  function fieldTime(F) { return F.t * TEMPO; }
  function buildRecipe(F) {
    var S = F.S, n = Math.max(0, Math.min(1, F.n)), d = S.depth, route = S.route, ft = fieldTime(F);
    var angleDeg = S.angle + (route === "flowAngle" ? (n - 0.5) * d * 180 : 0);
    var ang = angleDeg * Math.PI / 180;
    // The engine squares flow (engineFlowStrength = v^2 * 0.34), so low/mid
    // slider values produce ~no drift. Pre-compensate (sqrt) so the slider maps
    // to roughly-linear, visible drift speed without scrolling to garbage.
    var flowSlider = route === "flowStrength" ? Math.min(1.0, S.flow + n * d * 0.5) : S.flow;
    var flowEng = Math.sqrt(Math.max(0, flowSlider) * 1.6);
    var warpAmt = S.warp + (route === "warp.amount" ? n * d * 1.6 : 0);
    var recipe = {
      // phaseOffset advances with time -> the slice morphs IN PLACE. This is the
      // real "evolve": in the slice shader params.time only drives flow
      // translation, so without this the field is frozen unless it's drifting.
      variation: { seed: Math.round(S.seed) || 7, phaseOffset: ft * S.evolve * 10 },
      structure: { primitive: "simplex", fractalMode: S.fractal || "fbm", baseScale: S.baseScale,
        octaveCount: Math.round(S.octaves), roughness: S.detail, lacunarity: 2.0, detailScale: 1.6 },
      shape: { bias: 0, contrast: S.contrast, gain: 1, thresholdLow: S.tlo, thresholdHigh: 1, clampLow: 0, clampHigh: 1 },
      // evolutionRate also drives the CPU mirror's in-place morph; flow drifts
      // (with a steerable angle). Curl == the shader's directional domain-warp swirl.
      motion: { mode: (flowSlider > 0.01 ? "flow" : "evolve"), evolutionRate: S.evolve,
        flowDirection: [Math.cos(ang), Math.sin(ang)], flowStrength: flowEng },
      warp: { enabled: warpAmt > 0.001, warpType: (S.warpStyle === "curl" ? "directional" : "noiseOffset"), amount: warpAmt, scale: 1.0 },
      output: { outputType: "scalar", normalize: true, rangeMin: 0, rangeMax: 1 }
    };
    if (route === "thresholdLow") recipe.shape.thresholdLow = Math.max(0, Math.min(0.92, S.tlo + (n - 0.5) * d * 1.4));
    else if (route === "baseScale") recipe.structure.baseScale = S.baseScale * (1 + (n - 0.5) * d);
    return recipe;
  }

  var PAL_INDEX = { ember: 0, signal: 1, ice: 2 };
  function display(S) { return { palette: PAL_INDEX[S.palette] || 0, gain: S.gain, bias: 0.04 }; }

  // ---- JS colormap (matches the WGSL ramps) for the CPU fallback -----------
  var RAMPS = {
    ember: [[5, 3, 23], [56, 10, 77], [158, 26, 92], [232, 87, 46], [250, 184, 51], [255, 245, 204]],
    signal: [[3, 9, 14], [8, 46, 56], [26, 107, 92], [125, 199, 77], [232, 168, 41], [255, 247, 209]],
    ice: [[5, 5, 20], [15, 26, 87], [26, 82, 168], [51, 158, 217], [148, 219, 240], [245, 252, 255]]
  };
  // CPU fallback: etheros-lite sampled into a small offscreen buffer, then
  // scaled up with smoothing so it reads as a smooth field (not a mosaic).
  var off = null, octx = null;
  function render2D(ctx, W, H, F) {
    var S = F.S, recipe = buildRecipe(F), t = fieldTime(F);   // match GPU tempo
    var stops = RAMPS[S.palette] || RAMPS.ember, gain = S.gain, bias = 0.04;
    var cols = Math.min(220, Math.max(80, Math.round(W / 4))), rows = Math.round(cols * (H / W));
    if (!off) { off = document.createElement("canvas"); octx = off.getContext("2d"); }
    if (off.width !== cols || off.height !== rows) { off.width = cols; off.height = rows; }
    var img = octx.createImageData(cols, rows), data = img.data, ar = H / W;
    var er = elRecipe(recipe), p = 0;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var raw = EL.sample(er, c / cols, (r / rows) * ar, t);
      var v = Math.max(0, Math.min(1, (raw - bias) * gain)); v = v * v * (3 - 2 * v);
      var col = colorAt(stops, v);
      data[p++] = col[0]; data[p++] = col[1]; data[p++] = col[2]; data[p++] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(off, 0, 0, cols, rows, 0, 0, W, H);
  }
  function colorAt(stops, v) {
    v = Math.max(0, Math.min(1, v)) * 5; var i = Math.floor(v), f = v - i; if (i > 4) { i = 4; f = 1; }
    var a = stops[i], b = stops[i + 1] || stops[i];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  // etheros-lite expects structure.fractalMode + flat warp/motion blocks (same names).
  function elRecipe(r) {
    return { variation: r.variation,
      structure: { fractalMode: r.structure.fractalMode, baseScale: r.structure.baseScale, octaveCount: r.structure.octaveCount, roughness: r.structure.roughness, lacunarity: 2.0 },
      shape: r.shape, motion: r.motion, warp: r.warp };
  }

  var f2 = function (v) { return (+v).toFixed(2); };
  root.Demo = {
    title: "Field Bridge",
    driver: { x: { src: "sine", rate: 0.4 }, drive: "x" },
    // GPU path: run the canonical Etheros slice shader; recipe rebuilt per frame.
    gpu: {
      init: function (canvas) {
        if (!GPU) return null;
        return GPU.createSliceRenderer(canvas, { shaderBase: "../shared/etheros/" }).then(function (eng) {
          if (!eng) return null;
          // params.time drives flow translation; the recipe's phaseOffset (set
          // from time in buildRecipe) drives in-place evolution. Both share TEMPO.
          return { label: "Etheros WebGPU", render: function (F) { eng.render(buildRecipe(F), fieldTime(F), display(F.S)); } };
        });
      }
    },
    structure: [
      { tier: "structure", key: "fractal", label: "Fractal", type: "select", value: "fbm", options: [
        { value: "fbm", label: "fBm" }, { value: "ridged", label: "Ridged" }, { value: "billow", label: "Billow" }, { value: "turbulence", label: "Turbulence" } ] },
      { tier: "structure", key: "baseScale", label: "Base scale", type: "slider", min: 1, max: 8, step: 0.2, value: 3.4, fmt: f2 },
      { tier: "structure", key: "octaves", label: "Octaves <span>detail</span>", type: "slider", min: 1, max: 10, step: 1, value: 8 },
      { tier: "structure", key: "detail", label: "Roughness", type: "slider", min: 0.2, max: 1, step: 0.02, value: 0.72, fmt: f2 },
      { tier: "structure", key: "seed", label: "Seed", type: "slider", min: 1, max: 999, step: 1, value: 7 }
    ],
    shaping: [
      { tier: "shaping", key: "palette", label: "Palette", type: "select", value: "ember", options: [
        { value: "ember", label: "Ember" }, { value: "signal", label: "Signal" }, { value: "ice", label: "Ice" } ] },
      { tier: "shaping", key: "gain", label: "Intensity", type: "slider", min: 1, max: 5, step: 0.1, value: 2.6, fmt: f2 },
      { tier: "shaping", key: "contrast", label: "Shape · contrast", type: "slider", min: 0.4, max: 2.2, step: 0.05, value: 1.2, fmt: f2 },
      { tier: "shaping", key: "tlo", label: "Shape · threshold", type: "slider", min: 0, max: 0.8, step: 0.01, value: 0.25, fmt: f2 },
      { tier: "shaping", key: "evolve", label: "Evolve <span>morph</span>", type: "slider", min: 0, max: 1.5, step: 0.05, value: 0.6, fmt: f2 },
      { tier: "shaping", key: "flow", label: "Flow <span>drift</span>", type: "slider", min: 0, max: 1, step: 0.02, value: 0.35, fmt: f2 },
      { tier: "shaping", key: "angle", label: "Flow angle <span>°</span>", type: "slider", min: 0, max: 360, step: 5, value: 90, fmt: function (v) { return Math.round(v) + "°"; } },
      { tier: "shaping", key: "warpStyle", label: "Warp style", type: "select", value: "curl", options: [
        { value: "curl", label: "Curl (swirl)" }, { value: "organic", label: "Organic" } ] },
      { tier: "shaping", key: "warp", label: "Warp amount", type: "slider", min: 0, max: 1.2, step: 0.02, value: 0.3, fmt: f2 },
      { tier: "shaping", key: "route", label: "Signal → param", type: "select", value: "warp.amount", options: [
        { value: "warp.amount", label: "warp.amount" }, { value: "flowStrength", label: "motion.flowStrength" }, { value: "flowAngle", label: "motion.flowAngle" }, { value: "thresholdLow", label: "shape.thresholdLow" }, { value: "baseScale", label: "structure.baseScale" } ] },
      { tier: "shaping", key: "depth", label: "Route depth", type: "slider", min: 0, max: 1.5, step: 0.05, value: 0.7, fmt: f2 }
    ],
    presets: (root.DemoPresets || {}),
    render: render2D
  };
})(typeof self !== "undefined" ? self : this);
