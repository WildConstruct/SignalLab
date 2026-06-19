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
  function buildRecipe(F) {
    var S = F.S, n = Math.max(0, Math.min(1, F.n));
    var recipe = {
      variation: { seed: Math.round(S.seed) || 7 },
      structure: { primitive: "simplex", fractalMode: S.fractal || "fbm", baseScale: S.baseScale,
        octaveCount: Math.round(S.octaves), roughness: 0.55, lacunarity: 2.0 },
      shape: { bias: 0, contrast: S.contrast, gain: 1, thresholdLow: S.tlo, thresholdHigh: 1, clampLow: 0, clampHigh: 1 },
      motion: { mode: (S.flow > 0 ? "flow" : "evolve"), evolutionRate: 0.15, flowDirection: [0.2, 1], flowStrength: S.flow },
      warp: { enabled: true, amount: S.warp, scale: 1.0 },
      output: { outputType: "scalar", normalize: true, rangeMin: 0, rangeMax: 1 }
    };
    var d = S.depth, route = S.route;
    if (route === "warp.amount") recipe.warp.amount = S.warp + n * d * 2;
    else if (route === "flowStrength") { recipe.motion.mode = "flow"; recipe.motion.flowStrength = S.flow + n * d * 1.6; }
    else if (route === "thresholdLow") recipe.shape.thresholdLow = Math.max(0, Math.min(0.92, S.tlo + (n - 0.5) * d * 1.4));
    else if (route === "baseScale") recipe.structure.baseScale = S.baseScale * (1 + (n - 0.5) * d);
    return recipe;
  }

  // CPU fallback: etheros-lite heatmap (used only when WebGPU is unavailable).
  function render2D(ctx, W, H, F) {
    var recipe = buildRecipe(F), t = F.t;
    var cols = Math.min(120, Math.max(28, Math.round(W / 12))), rows = Math.min(70, Math.max(16, Math.round(H / 12)));
    var cw = W / cols, ch = H / rows, ar = H / W;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var v = EL.sample(elRecipe(recipe), c / cols, (r / rows) * ar, t);
      ctx.fillStyle = "hsl(" + (150 + v * 120) + ",80%," + (4 + v * v * 56) + "%)";
      ctx.fillRect(c * cw, r * ch, cw + 1, ch + 1);
    }
  }
  // etheros-lite expects structure.fractalMode + flat warp/motion blocks (same names).
  function elRecipe(r) {
    return { variation: r.variation,
      structure: { fractalMode: r.structure.fractalMode, baseScale: r.structure.baseScale, octaveCount: r.structure.octaveCount, roughness: 0.55, lacunarity: 2.0 },
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
          return { label: "Etheros WebGPU", render: function (F) { eng.render(buildRecipe(F), F.t); } };
        });
      }
    },
    structure: [
      { tier: "structure", key: "fractal", label: "Fractal", type: "select", value: "fbm", options: [
        { value: "fbm", label: "fBm" }, { value: "ridged", label: "Ridged" }, { value: "billow", label: "Billow" }, { value: "turbulence", label: "Turbulence" } ] },
      { tier: "structure", key: "baseScale", label: "Base scale", type: "slider", min: 1, max: 8, step: 0.2, value: 3, fmt: f2 },
      { tier: "structure", key: "octaves", label: "Octaves", type: "slider", min: 1, max: 7, step: 1, value: 5 },
      { tier: "structure", key: "seed", label: "Seed", type: "slider", min: 1, max: 999, step: 1, value: 7 }
    ],
    shaping: [
      { tier: "shaping", key: "contrast", label: "Shape · contrast", type: "slider", min: 0.4, max: 2.2, step: 0.05, value: 1.2, fmt: f2 },
      { tier: "shaping", key: "tlo", label: "Shape · threshold", type: "slider", min: 0, max: 0.8, step: 0.01, value: 0.25, fmt: f2 },
      { tier: "shaping", key: "warp", label: "Warp amount", type: "slider", min: 0, max: 1.2, step: 0.02, value: 0.25, fmt: f2 },
      { tier: "shaping", key: "flow", label: "Flow strength", type: "slider", min: 0, max: 1.5, step: 0.05, value: 0.2, fmt: f2 },
      { tier: "shaping", key: "route", label: "Signal → param", type: "select", value: "warp.amount", options: [
        { value: "warp.amount", label: "warp.amount" }, { value: "flowStrength", label: "motion.flowStrength" }, { value: "thresholdLow", label: "shape.thresholdLow" }, { value: "baseScale", label: "structure.baseScale" } ] },
      { tier: "shaping", key: "depth", label: "Route depth", type: "slider", min: 0, max: 1.5, step: 0.05, value: 0.7, fmt: f2 }
    ],
    presets: (root.DemoPresets || {}),
    render: render2D
  };
})(typeof self !== "undefined" ? self : this);
