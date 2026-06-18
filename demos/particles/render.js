/*
 * PARTICLES — Fountain (MVP)  (demos/particles/render.js)
 * Ported from tool/index.html `case "particles"`. The signal energy drives a
 * curved birth rate (quiet → sparse, peaks → eruption) and the spread. Reads
 * only n. The Entropy-driver integration proof.
 */
(function (root) {
  "use strict";
  var parts = [], last = null;

  function render(ctx, W, H, F) {
    var S = F.S, e = Math.max(0, Math.min(1, F.n)), t = F.t;
    var dt = last == null ? 1 / 60 : Math.max(0, Math.min(0.1, t - last)); last = t;
    var sp = dt * 60;                                  // frame-rate-independent step
    var cx = W / 2, cy = H * 0.62;
    var birth = Math.round(e * e * S.rate);            // curved
    var spread = 2.5 + e * S.spread;
    for (var i = 0; i < birth; i++) {
      var a = Math.random() * Math.PI * 2, v = Math.random() * spread;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, l: 1, sz: 2 + e * 4, h: 150 + e * 120 });
    }
    parts = parts.filter(function (p) { return p.l > 0; });
    if (parts.length > 4000) parts.splice(0, parts.length - 4000);
    for (var k = 0; k < parts.length; k++) {
      var p = parts[k];
      p.x += p.vx * sp; p.y += p.vy * sp; p.vy += 0.07 * sp; p.l -= 0.018 * sp;
      ctx.globalAlpha = Math.max(0, p.l * 0.92);
      ctx.fillStyle = "hsl(" + p.h + ",85%,58%)";
      ctx.fillRect(p.x, p.y, p.sz, p.sz);
    }
    ctx.globalAlpha = 1;
  }

  root.Demo = {
    title: "Particles — Fountain",
    driver: { x: { src: "sine", rate: 1.5 }, y: { src: "noise", rate: 3 }, drive: "max" },
    structure: [
      { tier: "structure", key: "rate",   label: "Birth rate", type: "slider", min: 4, max: 40, step: 1, value: 16 }
    ],
    shaping: [
      { tier: "shaping", key: "spread", label: "Spread / velocity", type: "slider", min: 2, max: 20, step: 0.5, value: 11, fmt: function (v) { return (+v).toFixed(1); } }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
