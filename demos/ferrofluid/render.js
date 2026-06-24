/*
 * FERROFLUID - Signal Rack magnetic resonance demo
 * A Signal Rack waveform mimics a magnetic field pulling a reflective black
 * 2.5D ferrofluid blob into lobes, droplets, and high-energy spikelets.
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
  function sceneMetrics(W, H) {
    var s = Math.min(W, H);
    return { cx: W * 0.5, cy: H * 0.57, sx: s * 0.5, sy: s * 0.36, s: s };
  }
  function project(m, x, y) {
    return { x: m.cx + x * m.sx, y: m.cy + y * m.sy };
  }
  function rgba(rgb, alpha) {
    return "rgba(" + Math.round(rgb[0]) + "," + Math.round(rgb[1]) + "," + Math.round(rgb[2]) + "," + alpha + ")";
  }
  function accentCss(S, alpha) {
    return rgba(accentColor(S.accent), alpha);
  }
  function drawFieldWell(ctx, W, H, S, m, actors) {
    var core = project(m, actors.core.x, actors.core.y);
    var rx = (0.5 + actors.core.energy * 0.16) * m.sx;
    var ry = (0.34 + actors.core.energy * 0.08) * m.sy;
    var g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, rx);
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
    ctx.ellipse(core.x, core.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawCorePool(ctx, W, H, F, field, actors) {
    var S = controlsFor(field, F), m = sceneMetrics(W, H), p = project(m, actors.core.x, actors.core.y);
    var rx = actors.core.rx * m.sx;
    var ry = actors.core.ry * m.sy;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.62)";
    ctx.shadowBlur = Math.max(12, m.s * 0.04);
    var body = ctx.createRadialGradient(p.x - rx * 0.28, p.y - ry * 0.6, 0, p.x, p.y, Math.max(rx, ry));
    body.addColorStop(0, "rgba(82,86,92,0.72)");
    body.addColorStop(0.12, "rgba(18,19,22,0.98)");
    body.addColorStop(0.72, "rgba(0,0,0,1)");
    body.addColorStop(1, "rgba(0,0,0,0.96)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255," + (0.12 + S.reflection * 0.1) + ")";
    ctx.lineWidth = Math.max(1, m.s * 0.002);
    ctx.stroke();
    ctx.restore();
  }
  function drawTravelingHighlights(ctx, W, H, F, field, actors) {
    var S = controlsFor(field, F), m = sceneMetrics(W, H), p = project(m, actors.core.x, actors.core.y);
    var t = Number(F && F.t) || 0;
    ctx.save();
    ctx.lineCap = "round";
    for (var i = 0; i < 4; i++) {
      var phase = t * (0.52 + S.resonance * 0.28) + i * 1.9;
      var alpha = (0.13 + Math.max(0, Math.sin(phase)) * 0.2) * S.reflection;
      var rx = (actors.core.rx * (0.44 + i * 0.11)) * m.sx;
      var ry = (actors.core.ry * (0.36 + i * 0.08)) * m.sy;
      ctx.strokeStyle = "rgba(255,255,255," + alpha + ")";
      ctx.lineWidth = Math.max(1, m.s * (0.0025 + i * 0.0007));
      ctx.beginPath();
      ctx.ellipse(p.x + Math.sin(phase) * m.s * 0.012, p.y - ry * 0.16, rx, ry, -0.3, Math.PI * 1.05, Math.PI * 1.72);
      ctx.stroke();
    }
    if (S.accent !== "none") {
      ctx.strokeStyle = accentCss(S, 0.34 * S.reflection);
      ctx.lineWidth = Math.max(1, m.s * 0.003);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, actors.core.rx * m.sx * 0.86, actors.core.ry * m.sy * 0.78, 0.16, Math.PI * 1.14, Math.PI * 1.52);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawDroplets(ctx, W, H, F, field) {
    var S = controlsFor(field, F), m = sceneMetrics(W, H), drops = Model.buildDroplets(F, field);
    var t = Number(F && F.t) || 0;
    drops.forEach(function (d, index) {
      var wobble = Math.sin(t * (1.7 + field.energy) + d.phase * Math.PI * 2 + index) * 0.035 * (0.4 + S.resonance);
      var p = project(m, d.x + wobble, d.y * 0.64 + Math.cos(t * 1.1 + index) * 0.012);
      var r = Math.max(3, d.r * m.s * (1.05 + field.spike * 0.55));
      var g = ctx.createRadialGradient(p.x - r * 0.38, p.y - r * 0.5, 0, p.x, p.y, r);
      g.addColorStop(0, "rgba(255,255,255,0.92)");
      g.addColorStop(0.15, "rgba(48,50,56,0.88)");
      g.addColorStop(0.46, "rgba(2,2,3,1)");
      g.addColorStop(1, "rgba(0,0,0,0.96)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 1.16, r * 0.92, wobble * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function drawSpikeBase(ctx, m, S, spike) {
    var p = project(m, spike.x, spike.y);
    var r = Math.max(3, spike.baseRadius * m.s * (1.1 + spike.energy * 0.28));
    var g = ctx.createRadialGradient(p.x - r * 0.34, p.y - r * 0.5, 0, p.x, p.y, r * 1.2);
    g.addColorStop(0, "rgba(255,255,255,0.78)");
    g.addColorStop(0.16, "rgba(45,48,54,0.86)");
    g.addColorStop(0.55, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0.95)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.25, r * 0.86, spike.angle * 0.2, 0, Math.PI * 2);
    ctx.fill();
    if (S.accent !== "none" && spike.energy > 0.75) {
      ctx.fillStyle = accentCss(S, 0.34);
      ctx.beginPath();
      ctx.ellipse(p.x + r * 0.36, p.y - r * 0.38, r * 0.26, r * 0.1, spike.angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawSpikeCone(ctx, m, S, F, spike) {
    var b = project(m, spike.x, spike.y), tip = project(m, spike.tipX, spike.tipY);
    var dx = tip.x - b.x, dy = tip.y - b.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var px = -dy / len, py = dx / len;
    var width = Math.max(4, spike.baseRadius * m.s * (0.72 + spike.energy * 0.26));
    var grd = ctx.createLinearGradient(tip.x, tip.y, b.x, b.y);
    grd.addColorStop(0, "rgba(168,174,186,0.56)");
    grd.addColorStop(0.13, "rgba(42,44,50,0.82)");
    grd.addColorStop(0.62, "rgba(4,4,6,1)");
    grd.addColorStop(1, "rgba(0,0,0,0.96)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.quadraticCurveTo(b.x + px * width * 1.08 + dx * 0.18, b.y + py * width * 1.08 + dy * 0.18, b.x + px * width, b.y + py * width);
    ctx.quadraticCurveTo(b.x - dx * 0.08, b.y - dy * 0.05, b.x - px * width, b.y - py * width);
    ctx.quadraticCurveTo(b.x - px * width * 0.82 + dx * 0.14, b.y - py * width * 0.82 + dy * 0.14, tip.x, tip.y);
    ctx.closePath();
    ctx.fill();
    var shimmer = (0.45 + Math.sin(((Number(F && F.t) || 0) * 4.8) + spike.phase * Math.PI * 2) * 0.35) * S.reflection;
    ctx.strokeStyle = "rgba(255,255,255," + (0.035 * S.reflection) + ")";
    ctx.lineWidth = Math.max(1, width * 0.03);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255," + Math.min(0.86, 0.16 + shimmer * spike.energy * 0.46) + ")";
    ctx.lineWidth = Math.max(1, width * 0.08);
    ctx.beginPath();
    ctx.moveTo(tip.x + px * width * 0.04, tip.y + py * width * 0.04);
    ctx.quadraticCurveTo(b.x + px * width * 0.58 + dx * 0.18, b.y + py * width * 0.58 + dy * 0.18, b.x + px * width * 0.2, b.y + py * width * 0.2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255," + (0.08 * S.reflection) + ")";
    ctx.lineWidth = Math.max(1, width * 0.032);
    ctx.beginPath();
    ctx.moveTo(tip.x - px * width * 0.08, tip.y - py * width * 0.08);
    ctx.quadraticCurveTo(b.x - px * width * 0.48 + dx * 0.2, b.y - py * width * 0.48 + dy * 0.2, b.x - px * width * 0.14, b.y - py * width * 0.14);
    ctx.stroke();
  }
  function drawResonantSpikes(ctx, W, H, F, field, actors) {
    var S = controlsFor(field, F), m = sceneMetrics(W, H);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = Math.max(2, m.s * 0.006);
    actors.spikes.forEach(function (spike) { drawSpikeBase(ctx, m, S, spike); });
    actors.spikes.forEach(function (spike) { drawSpikeCone(ctx, m, S, F, spike); });
    ctx.restore();
  }
  function render2D(ctx, W, H, F) {
    var field = Model.buildField(F);
    var actors = Model.buildSurfaceActors(F, field);
    drawStage(ctx, W, H, controlsFor(field, F));
    drawFieldWell(ctx, W, H, controlsFor(field, F), sceneMetrics(W, H), actors);
    drawCorePool(ctx, W, H, F, field, actors);
    drawDroplets(ctx, W, H, F, field);
    drawResonantSpikes(ctx, W, H, F, field, actors);
    drawTravelingHighlights(ctx, W, H, F, field, actors);
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
