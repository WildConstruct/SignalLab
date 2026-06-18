/*
 * KINETIC TYPE — wave / pump / glitch / shake  (demos/kinetic-type/render.js)
 * -------------------------------------------------------------------------
 * Signal-driven type. A variant picker switches between ports of tool's
 * type / textPump / textGlitch / textShake. Reads n + bufX/bufY (via the
 * engine's combine()). Word is editable; the shaping amount scales the effect.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var combine = root.SignalEngine.combine;

  function wave(ctx, W, H, F, txt, amp, mode) {
    var bx = F.bufX, by = F.bufY, L = bx.length, cx = W / 2, cy = H / 2;
    var fs = Math.max(20, Math.min(54, W / 10));
    ctx.font = "bold " + fs + "px ui-monospace,Menlo,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var cw = fs * 0.64, x0 = cx - (txt.length - 1) * cw / 2, stride = Math.max(1, Math.floor(L / (txt.length * 1.4)));
    for (var i = 0; i < txt.length; i++) {
      if (txt[i] === " ") continue;
      var idx = Math.max(0, Math.min(L - 1, L - 1 - i * stride)), v = combine(mode, bx[idx], by[idx]);
      var yoff = (v * 2 - 1) * H * 0.17 * amp, s = 0.82 + v * 0.5;
      ctx.save(); ctx.translate(x0 + i * cw, cy + yoff); ctx.scale(s, s);
      ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 10 * v; ctx.fillStyle = "hsl(" + (150 + v * 45) + ",85%," + (42 + v * 34) + "%)";
      ctx.fillText(txt[i], 0, 0); ctx.restore();
    }
    ctx.textBaseline = "alphabetic";
  }
  function pump(ctx, W, H, F, txt, amp) {
    var e = Math.max(0, Math.min(1, F.n)), cx = W / 2, cy = H / 2;
    var fs = Math.max(26, Math.min(96, W / 7)) * (0.78 + e * 0.5 * amp);
    ctx.font = "900 " + fs + "px ui-monospace,Menlo,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.32 + e * 0.68; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8 + e * 44;
    ctx.fillStyle = "hsl(" + (150 + e * 60) + ",85%," + (50 + e * 22) + "%)"; ctx.fillText(txt, cx, cy);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.textBaseline = "alphabetic";
  }
  function glitch(ctx, W, H, F, txt, amp, mode) {
    var bx = F.bufX, by = F.bufY, L = bx.length, n = F.n, e = Math.max(0, Math.min(1, n)), cx = W / 2, cy = H / 2;
    var fs = Math.max(22, Math.min(64, W / 8)); ctx.font = "900 " + fs + "px ui-monospace,Menlo,monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var ox = (n * 2 - 1) * (4 + e * 18) * amp, oy = (combine(mode, by[L >> 1], bx[L >> 1]) * 2 - 1) * e * 5 * amp;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.85; ctx.fillStyle = "#ff2d4d"; ctx.fillText(txt, cx - ox, cy - oy);
    ctx.fillStyle = "#2dd4ff"; ctx.fillText(txt, cx + ox, cy + oy);
    ctx.globalAlpha = 0.95; ctx.fillStyle = "#eaf6f5"; ctx.fillText(txt, cx, cy);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic";
  }
  function shake(ctx, W, H, F, txt, amp) {
    var e = Math.max(0, Math.min(1, F.n)), cx = W / 2, cy = H / 2;
    var a = e * e * 22 * amp, dx = (Math.random() - 0.5) * a, dy = (Math.random() - 0.5) * a, fs = Math.round(Math.min(W, H) * 0.16 * (0.9 + e * 0.3));
    ctx.font = "900 " + fs + "px ui-monospace,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (e > 0.6) { ctx.globalAlpha = 0.5; ctx.fillStyle = "#ff2d4d"; ctx.fillText(txt, cx + dx - a * 0.3, cy + dy); ctx.fillStyle = "#2dd4ff"; ctx.fillText(txt, cx + dx + a * 0.3, cy + dy); ctx.globalAlpha = 1; }
    ctx.fillStyle = "#eaf6f5"; ctx.fillText(txt, cx + dx, cy + dy); ctx.textBaseline = "alphabetic";
  }

  function render(ctx, W, H, F) {
    var S = F.S, txt = (S.word || "SIGNAL RACK").toString(), amp = S.amp, mode = S._drive || "x";
    switch (S.variant) {
      case "pump":   pump(ctx, W, H, F, txt, amp); break;
      case "glitch": glitch(ctx, W, H, F, txt, amp, mode); break;
      case "shake":  shake(ctx, W, H, F, txt, amp); break;
      default:       wave(ctx, W, H, F, txt, amp, mode);
    }
  }

  root.Demo = {
    title: "Kinetic Type",
    driver: { x: { src: "sine", rate: 1.4 }, y: { src: "sine", rate: 2, phase: 0.25 }, drive: "mult" },
    structure: [
      { tier: "structure", key: "variant", label: "Variant", type: "select", value: "wave", options: [
        { value: "wave", label: "Kinetic wave" }, { value: "pump", label: "Title pump" }, { value: "glitch", label: "RGB glitch" }, { value: "shake", label: "Shake / impact" } ] },
      { tier: "structure", key: "word", label: "Word", type: "text", value: "SIGNAL RACK" }
    ],
    shaping: [
      { tier: "shaping", key: "amp", label: "Amount", type: "slider", min: 0, max: 2, step: 0.05, value: 1, fmt: function (v) { return (+v).toFixed(2); } }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
