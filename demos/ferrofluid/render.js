/*
 * FERROFLUID - Signal Rack magnetic resonance demo
 * A Signal Rack waveform is pushed through a small fluid/height solver,
 * displacing a reflective black ferrofluid surface.
 */
(function (root) {
  "use strict";
  var Model = root.FerrofluidModel;
  var WebGL = root.FerrofluidWebGL;

  function controlsFor(field, F) {
    return field.controls || (Model.normalizeControls ? Model.normalizeControls(F && F.S) : (F && F.S) || {});
  }
  function accentColor(name) {
    if (name === "magenta") return [255, 42, 232];
    if (name === "amber") return [255, 186, 78];
    if (name === "signal") return [54, 240, 154];
    return [255, 255, 255];
  }
  function drawStage(ctx, W, H, S) {
    var cx = W / 2, cy = H / 2;
    if (S.stage === "dark") {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.58);
      g.addColorStop(0, "#161214"); g.addColorStop(0.58, "#050506"); g.addColorStop(1, "#000");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.beginPath();
      ctx.ellipse(cx, cy + H * 0.18, W * 0.27, H * 0.075, 0, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    ctx.fillStyle = S.stage === "plate" ? "#d7d5ce" : "#eeeeea";
    ctx.fillRect(0, 0, W, H);
    var aperture = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.42);
    aperture.addColorStop(0, "#ffffff"); aperture.addColorStop(0.68, "#f9f8f2"); aperture.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = aperture; ctx.beginPath(); ctx.arc(cx, cy, Math.min(W, H) * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(30,30,28,0.08)"; ctx.lineWidth = 2; ctx.beginPath();
    ctx.arc(cx, cy, Math.min(W, H) * 0.34, 0, Math.PI * 2); ctx.stroke();
  }
  var solver = null, solverCols = 0, solverRows = 0;
  var fluidCanvas = null, fluidCtx = null, fluidImage = null;

  function ensureFluidSurface(W, H) {
    var cols = Math.min(180, Math.max(96, Math.round(W / 5)));
    var rows = Math.min(150, Math.max(72, Math.round(cols * H / W)));
    if (!solver || cols !== solverCols || rows !== solverRows) {
      solver = Model.createFluidSolver(cols, rows);
      solverCols = cols;
      solverRows = rows;
      fluidCanvas = document.createElement("canvas");
      fluidCanvas.width = cols;
      fluidCanvas.height = rows;
      fluidCtx = fluidCanvas.getContext("2d");
      fluidImage = fluidCtx.createImageData(cols, rows);
    }
  }

  function drawMagneticWell(ctx, W, H, S, snapshot) {
    var cx = W * 0.5;
    var cy = H * 0.55;
    var rx = W * (0.3 + S.blobSize * 0.12);
    var ry = H * (0.22 + S.blobSize * 0.08);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    if (S.stage === "dark") {
      g.addColorStop(0, "rgba(92,102,100,0.34)");
      g.addColorStop(0.55, "rgba(42,52,52,0.2)");
      g.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      g.addColorStop(0, "rgba(255,255,255,0.62)");
      g.addColorStop(0.55, "rgba(150,174,170,0.16)");
      g.addColorStop(1, "rgba(255,255,255,0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * (1 + snapshot.stats.mass * 0.18), ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function shadeFluidPixel(F, snapshot, sx, sy) {
    var S = snapshot.controls;
    var t = Number(F && F.t) || 0;
    var sample = Model.sampleFluidSurface(snapshot, sx, sy);
    if (sample.mask <= 0.002) return [0, 0, 0, 0];

    var n = sample.normal;
    var h = sample.height;
    var rim = Math.pow(Math.max(0, 1 - n[2]), 1.1);
    var key = Math.pow(Math.max(0, n[0] * -0.42 + n[1] * -0.66 + n[2] * 0.78), 28) * S.reflection;
    var sweep = Math.pow(Math.max(0, Math.sin((sx * 2.2 - sy * 1.25 + h * 7.2 + t * 0.42) * Math.PI)), 42) * S.reflection;
    var ridge = Math.pow(Math.max(0, h - 0.28), 1.45) * 38;
    var base = Math.max(0, Math.min(22, h * 12));
    var hi = (key * 210 + sweep * 58 + rim * 28 + ridge) * sample.mask;
    var r = base + hi;
    var g = base + hi;
    var b = base + hi + Math.min(12, h * 18);

    if (S.accent !== "none") {
      var ac = accentColor(S.accent);
      var accent = Math.pow(Math.max(0, Math.sin((sx * 5.7 + sy * 3.1 + h * 5 + t * 0.7) * Math.PI)), 24) * sample.mask * S.resonance * 0.35;
      r += ac[0] * accent;
      g += ac[1] * accent;
      b += ac[2] * accent;
    }

    return [
      Math.max(0, Math.min(255, r)),
      Math.max(0, Math.min(255, g)),
      Math.max(0, Math.min(255, b)),
      Math.max(0, Math.min(255, sample.mask * 255))
    ];
  }

  function drawFluidSurface(ctx, W, H, F, field) {
    ensureFluidSurface(W, H);
    var snapshot = solver.step(F);
    drawMagneticWell(ctx, W, H, controlsFor(field, F), snapshot);

    var data = fluidImage.data;
    var p = 0;
    for (var y = 0; y < solverRows; y++) {
      for (var x = 0; x < solverCols; x++) {
        var sx = x / (solverCols - 1) * 2 - 1;
        var sy = y / (solverRows - 1) * 2 - 1;
        var c = shadeFluidPixel(F, snapshot, sx, sy);
        data[p++] = c[0];
        data[p++] = c[1];
        data[p++] = c[2];
        data[p++] = c[3];
      }
    }
    fluidCtx.putImageData(fluidImage, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.shadowColor = "rgba(0,0,0,0.58)";
    ctx.shadowBlur = Math.min(W, H) * 0.035;
    ctx.drawImage(fluidCanvas, 0, 0, W, H);
    ctx.restore();
  }

  function render2D(ctx, W, H, F) {
    var field = Model.buildField(F);
    drawStage(ctx, W, H, controlsFor(field, F));
    drawFluidSurface(ctx, W, H, F, field);
  }

  var f2 = function (v) { return (+v).toFixed(2); };
  root.Demo = {
    title: "Ferrofluid",
    driver: { x: { src: "sine", rate: 1.1, smooth: 0.12 }, y: { src: "triangle", rate: 1.6, phase: 0.25 }, drive: "max" },
    gpu: { init: function (canvas) { return WebGL && WebGL.createRenderer ? WebGL.createRenderer(canvas) : null; } },
    structure: [
      { tier: "structure", key: "stage", label: "Stage", type: "select", value: "dark", options: [
        { value: "aperture", label: "Aperture" }, { value: "dark", label: "Dark stage" }, { value: "plate", label: "Macro plate" } ] },
      { tier: "structure", key: "blobSize", label: "Blob size", type: "slider", min: 0.38, max: 1, step: 0.01, value: 0.82, fmt: f2 },
      { tier: "structure", key: "surfaceTension", label: "Surface tension", type: "slider", min: 0, max: 1, step: 0.01, value: 0.42, fmt: f2 },
      { tier: "structure", key: "droplets", label: "Droplets", type: "slider", min: 0, max: 1, step: 0.01, value: 0.5, fmt: f2 },
      { tier: "structure", key: "seed", label: "Seed", type: "slider", min: 1, max: 999, step: 1, value: 94 }
    ],
    shaping: [
      { tier: "shaping", key: "fieldStrength", label: "Field strength", type: "slider", min: 0, max: 1, step: 0.01, value: 0.96, fmt: f2 },
      { tier: "shaping", key: "resonance", label: "Resonance", type: "slider", min: 0, max: 1, step: 0.01, value: 0.88, fmt: f2 },
      { tier: "shaping", key: "viscosity", label: "Viscosity", type: "slider", min: 0, max: 1, step: 0.01, value: 0.34, fmt: f2 },
      { tier: "shaping", key: "lobeCount", label: "Lobes", type: "slider", min: 3, max: 12, step: 1, value: 10 },
      { tier: "shaping", key: "reflection", label: "Reflection", type: "slider", min: 0, max: 1, step: 0.01, value: 1, fmt: f2 },
      { tier: "shaping", key: "accent", label: "Accent", type: "select", value: "none", options: [
        { value: "none", label: "None" }, { value: "magenta", label: "Magenta" }, { value: "amber", label: "Amber" }, { value: "signal", label: "Signal green" } ] },
      { tier: "shaping", key: "spikeThreshold", label: "Spike threshold", type: "slider", min: 0.2, max: 1, step: 0.01, value: 0.58, fmt: f2 }
    ],
    presets: (root.DemoPresets || {}),
    render: render2D
  };
})(typeof self !== "undefined" ? self : this);
