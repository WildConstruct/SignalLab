/*
 * FERROFLUID - Signal Rack magnetic resonance demo
 * A Signal Rack waveform mimics a magnetic field pulling a reflective black
 * 2.5D ferrofluid blob into lobes, droplets, and high-energy spikelets.
 */
(function (root) {
  "use strict";
  var Model = root.FerrofluidModel;
  var WebGL = root.FerrofluidWebGL;

  var off = null, octx = null, imageData = null;
  function ensureOffscreen(cols, rows) {
    if (!off) { off = document.createElement("canvas"); octx = off.getContext("2d"); }
    if (off.width !== cols || off.height !== rows) {
      off.width = cols; off.height = rows;
      imageData = octx.createImageData(cols, rows);
    }
  }
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
  function shadePixel(F, field, x, y) {
    var s = Model.sampleSurface(F, field, x, y);
    if (s.mask <= 0.005) return [0, 0, 0, 0];
    var n = s.normal, S = controlsFor(field, F);
    var rim = Math.pow(Math.max(0, 1 - n[2]), 1.7);
    var key = Math.pow(Math.max(0, n[0] * -0.58 + n[1] * -0.42 + n[2] * 0.82), 34) * S.reflection;
    var strip = Math.pow(Math.max(0, Math.sin((x * 2.8 - y * 1.4 + F.t * 0.22) * Math.PI * 2)), 18) * S.reflection * 0.7;
    var wet = Math.pow(Math.max(0, s.height), 1.4) * 18;
    var base = 2 + wet;
    var col = [base, base, base + 2];
    var hi = (key + strip + rim * 0.22) * 255;
    col[0] += hi; col[1] += hi; col[2] += hi;
    if (S.accent !== "none") {
      var ac = accentColor(S.accent);
      var accent = Math.pow(Math.max(0, Math.sin((x * 4.1 + y * 1.7 + F.t * 0.37) * Math.PI)), 22) * S.reflection * s.pressure;
      col[0] += ac[0] * accent; col[1] += ac[1] * accent; col[2] += ac[2] * accent;
    }
    return [
      Math.max(0, Math.min(255, col[0])),
      Math.max(0, Math.min(255, col[1])),
      Math.max(0, Math.min(255, col[2])),
      Math.max(0, Math.min(255, s.mask * 255))
    ];
  }
  function drawBlob(ctx, W, H, F, field) {
    var cols = Math.min(260, Math.max(140, Math.round(W / 3.2)));
    var rows = Math.max(1, Math.round(cols * H / W));
    ensureOffscreen(cols, rows);
    var img = imageData, data = img.data, p = 0;
    var aspect = W / H;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var nx = (x / (cols - 1) * 2 - 1) * aspect;
        var ny = y / (rows - 1) * 2 - 1;
        var c = shadePixel(F, field, nx, ny);
        data[p++] = c[0]; data[p++] = c[1]; data[p++] = c[2]; data[p++] = c[3];
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = Math.min(W, H) * 0.04;
    ctx.drawImage(off, 0, 0, cols, rows, 0, 0, W, H);
    ctx.shadowBlur = 0;
  }
  function drawDroplets(ctx, W, H, F, field) {
    var drops = Model.buildDroplets(F, field), cx = W / 2, cy = H / 2, scale = Math.min(W, H) * 0.52;
    drops.forEach(function (d) {
      var x = cx + d.x * scale, y = cy + d.y * scale, r = Math.max(2, d.r * scale);
      var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.45, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.18, "rgba(46,46,52,0.85)");
      g.addColorStop(1, "rgba(0,0,0,0.98)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
  }
  function render2D(ctx, W, H, F) {
    var field = Model.buildField(F);
    drawStage(ctx, W, H, controlsFor(field, F));
    drawDroplets(ctx, W, H, F, field);
    drawBlob(ctx, W, H, F, field);
  }

  var f2 = function (v) { return (+v).toFixed(2); };
  root.Demo = {
    title: "Ferrofluid",
    driver: { x: { src: "sine", rate: 0.45, smooth: 0.25 }, y: { src: "sine", rate: 0.9, phase: 0.2 }, drive: "max" },
    gpu: { init: function (canvas) { return WebGL && WebGL.createRenderer ? WebGL.createRenderer(canvas) : null; } },
    structure: [
      { tier: "structure", key: "stage", label: "Stage", type: "select", value: "aperture", options: [
        { value: "aperture", label: "Aperture" }, { value: "dark", label: "Dark stage" }, { value: "plate", label: "Macro plate" } ] },
      { tier: "structure", key: "blobSize", label: "Blob size", type: "slider", min: 0.38, max: 1.1, step: 0.01, value: 0.76, fmt: f2 },
      { tier: "structure", key: "surfaceTension", label: "Surface tension", type: "slider", min: 0, max: 1, step: 0.01, value: 0.76, fmt: f2 },
      { tier: "structure", key: "droplets", label: "Droplets", type: "slider", min: 0, max: 1, step: 0.01, value: 0.28, fmt: f2 },
      { tier: "structure", key: "seed", label: "Seed", type: "slider", min: 1, max: 999, step: 1, value: 19 }
    ],
    shaping: [
      { tier: "shaping", key: "fieldStrength", label: "Field strength", type: "slider", min: 0, max: 1, step: 0.01, value: 0.62, fmt: f2 },
      { tier: "shaping", key: "resonance", label: "Resonance", type: "slider", min: 0, max: 1, step: 0.01, value: 0.48, fmt: f2 },
      { tier: "shaping", key: "viscosity", label: "Viscosity", type: "slider", min: 0, max: 1, step: 0.01, value: 0.72, fmt: f2 },
      { tier: "shaping", key: "lobeCount", label: "Lobes", type: "slider", min: 3, max: 12, step: 1, value: 4 },
      { tier: "shaping", key: "reflection", label: "Reflection", type: "slider", min: 0, max: 1, step: 0.01, value: 0.92, fmt: f2 },
      { tier: "shaping", key: "accent", label: "Accent", type: "select", value: "none", options: [
        { value: "none", label: "None" }, { value: "magenta", label: "Magenta" }, { value: "amber", label: "Amber" }, { value: "signal", label: "Signal green" } ] },
      { tier: "shaping", key: "spikeThreshold", label: "Spike threshold", type: "slider", min: 0.2, max: 1, step: 0.01, value: 0.9, fmt: f2 }
    ],
    presets: (root.DemoPresets || {}),
    render: render2D
  };
})(typeof self !== "undefined" ? self : this);
