/*
 * PARTICLES — fountain / shock rings / stream  (demos/particles/render.js)
 * -------------------------------------------------------------------------
 * Signal-driven emitters; the bridge to Entropy. A variant picker switches
 * between ports of tool's particles / partRings / partStream. The signal energy
 * drives birth rate / burst threshold / density. Reads only n.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var parts = [], rings = [], prevE = 0, last = null;

  function step(F) { var t = F.t, dt = last == null ? 1 / 60 : Math.max(0, Math.min(0.1, t - last)); last = t; return dt * 60; }

  function fountain(ctx, W, H, F, sp) {
    var S = F.S, e = root.SignalShaping.response(Math.max(0, Math.min(1, F.n)), F.S), cx = W / 2, cy = H * 0.62;
    var birth = Math.round(e * e * S.rate), spread = 2.5 + e * S.spread;
    for (var i = 0; i < birth; i++) { var a = Math.random() * Math.PI * 2, v = Math.random() * spread;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, l: 1, sz: 2 + e * 4, h: 150 + e * 120 }); }
    parts = parts.filter(function (p) { return p.l > 0; });
    if (parts.length > 4000) parts.splice(0, parts.length - 4000);
    for (var k = 0; k < parts.length; k++) { var p = parts[k];
      p.x += p.vx * sp; p.y += p.vy * sp; p.vy += 0.07 * sp; p.l -= 0.018 * sp;
      ctx.globalAlpha = Math.max(0, p.l * 0.92); ctx.fillStyle = "hsl(" + p.h + ",85%,58%)"; ctx.fillRect(p.x, p.y, p.sz, p.sz); }
    ctx.globalAlpha = 1;
  }
  function shockRings(ctx, W, H, F, sp) {
    var S = F.S, e = root.SignalShaping.response(Math.max(0, Math.min(1, F.n)), F.S), cx = W / 2, cy = H / 2, thr = S.burst;
    if (e > thr && e > prevE + 0.03) rings.push({ r: 8, l: 1, h: 150 + e * 120, w: 1.5 + e * 3.5 });
    prevE = e; rings = rings.filter(function (R) { return R.l > 0; });
    for (var i = 0; i < rings.length; i++) { var R = rings[i];
      R.r += (3.2 + (1 - R.l) * 7) * sp; R.l -= 0.02 * sp;
      ctx.globalAlpha = Math.max(0, R.l); ctx.strokeStyle = "hsl(" + R.h + ",85%,60%)"; ctx.lineWidth = Math.max(0.5, R.w * R.l);
      ctx.shadowColor = "hsl(" + R.h + ",85%,60%)"; ctx.shadowBlur = 8 * R.l; ctx.beginPath(); ctx.arc(cx, cy, R.r, 0, 7); ctx.stroke(); }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    ctx.fillStyle = "hsl(" + (150 + e * 120) + ",85%,60%)"; ctx.beginPath(); ctx.arc(cx, cy, 3 + e * 5, 0, 7); ctx.fill();
  }
  function stream(ctx, W, H, F, sp) {
    var S = F.S, e = root.SignalShaping.response(Math.max(0, Math.min(1, F.n)), F.S), cy = H / 2;
    var birth = Math.round(1 + e * (S.rate / 6 + 1));
    for (var i = 0; i < birth; i++) parts.push({ x: 0, y: cy + (Math.random() - 0.5) * H * 0.78 * (0.25 + e), vx: 2.5 + e * 8 + Math.random() * 2, vy: (Math.random() - 0.5) * 1.4, l: 1, sz: 1.5 + e * 3, h: 150 + e * 120 });
    parts = parts.filter(function (p) { return p.l > 0 && p.x < W + 12; });
    if (parts.length > 4000) parts.splice(0, parts.length - 4000);
    for (var k = 0; k < parts.length; k++) { var p = parts[k];
      p.x += p.vx * sp; p.y += p.vy * sp; p.l -= 0.006 * sp;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.l)); ctx.fillStyle = "hsl(" + p.h + ",85%,60%)"; ctx.fillRect(p.x, p.y, p.sz * 2.2, p.sz); }
    ctx.globalAlpha = 1;
  }

  function render(ctx, W, H, F) {
    var sp = step(F);
    switch (F.S.variant) {
      case "rings":  shockRings(ctx, W, H, F, sp); break;
      case "stream": stream(ctx, W, H, F, sp); break;
      default:       fountain(ctx, W, H, F, sp);
    }
  }

  root.Demo = {
    title: "Particles",
    driver: { x: { src: "sine", rate: 1.5 }, y: { src: "noise", rate: 3 }, drive: "max" },
    structure: [
      { tier: "structure", key: "variant", label: "Emitter", type: "select", value: "fountain", options: [
        { value: "fountain", label: "Fountain" }, { value: "rings", label: "Shock rings" }, { value: "stream", label: "Stream field" } ] },
      { tier: "structure", key: "rate", label: "Birth rate / density", type: "slider", min: 4, max: 40, step: 1, value: 16 }
    ],
    shaping: [
      { tier: "shaping", key: "spread", label: "Spread / velocity <span>(fountain)</span>", type: "slider", min: 2, max: 20, step: 0.5, value: 11, fmt: function (v) { return (+v).toFixed(1); } },
      { tier: "shaping", key: "burst",  label: "Burst threshold <span>(rings)</span>", type: "slider", min: 0.2, max: 0.9, step: 0.01, value: 0.5, fmt: function (v) { return (+v).toFixed(2); } }
    ].concat(root.SignalShaping.responseSpecs({ gamma: 1 })),
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
