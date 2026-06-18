/*
 * TRANSITIONS — loading bar / wipe / radial / text-reveal  (demos/transitions/render.js)
 * -------------------------------------------------------------------------
 * Signal-shaped animate-ins. A monotonic playhead climbs (never regresses) at a
 * pace shaped by the signal; an easing curve and a variant selector decide how
 * it reads. Ports tool/index.html trLoad / trWipe / trRadial / trText. Reads n
 * for pace + bufX for the text-reveal per-letter rise.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var prog = 0, last = null;

  var EASE = {
    linear: function (p) { return p; },
    smooth: function (p) { return p * p * (3 - 2 * p); },
    in: function (p) { return p * p; },
    out: function (p) { return 1 - (1 - p) * (1 - p); }
  };

  function bar(ctx, W, H, p, S) {
    var cx = W / 2, cy = H / 2, bw = Math.min(W * S.width, 560), bh = Math.min(H * 0.12, 52), x = cx - bw / 2, y = cy - bh / 2;
    ctx.strokeStyle = "#1f5e4e"; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = "#36f09a"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 14;
    ctx.fillRect(x + 3, y + 3, (bw - 6) * p, bh - 6); ctx.shadowBlur = 0;
    ctx.fillStyle = "#eaf6f5"; ctx.font = "700 " + Math.round(bh * 0.62) + "px ui-monospace,monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(Math.round(p * 100) + "%", cx, y - bh * 0.7); ctx.textBaseline = "alphabetic";
  }
  function wipe(ctx, W, H, p) {
    var cx = W / 2, cy = H / 2, txt = "SIGNAL", fs = Math.round(Math.min(W, H) * 0.2);
    ctx.font = "900 " + fs + "px ui-monospace,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#16242c"; ctx.fillText(txt, cx, cy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, p * W, H); ctx.clip();
    ctx.fillStyle = "#36f09a"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 16; ctx.fillText(txt, cx, cy); ctx.restore();
    ctx.strokeStyle = "#7df0c2"; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(p * W, cy - fs * 0.6); ctx.lineTo(p * W, cy + fs * 0.6); ctx.stroke(); ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic";
  }
  function radial(ctx, W, H, p) {
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.3, a0 = -Math.PI / 2;
    ctx.lineCap = "round"; ctx.lineWidth = 12; ctx.strokeStyle = "#16222b"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.strokeStyle = "#36f09a"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + p * Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; ctx.lineCap = "butt";
    ctx.fillStyle = "#eaf6f5"; ctx.font = "700 " + Math.round(Math.min(W, H) * 0.13) + "px ui-monospace,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(Math.round(p * 100) + "%", cx, cy); ctx.textBaseline = "alphabetic";
  }
  function textReveal(ctx, W, H, p, bx, L) {
    var cx = W / 2, cy = H / 2, txt = "ANIMATE IN", fs = Math.round(Math.min(W, H) * 0.13);
    ctx.font = "800 " + fs + "px ui-monospace,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var cw = fs * 0.62, x0 = cx - (txt.length - 1) * cw / 2;
    for (var i = 0; i < txt.length; i++) {
      if (txt[i] === " ") continue; var lp = i / Math.max(1, txt.length - 1);
      var local = Math.max(0, Math.min(1, (p - lp * 0.7) / 0.32)), ease = local * local * (3 - 2 * local), sig = bx[Math.floor(lp * (L - 1))];
      var yoff = (1 - ease) * fs * 0.7 * (0.4 + sig);
      ctx.globalAlpha = ease; ctx.fillStyle = "#36f09a"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 10 * ease; ctx.fillText(txt[i], x0 + i * cw, cy + yoff);
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.textBaseline = "alphabetic";
  }

  function render(ctx, W, H, F) {
    var S = F.S, e = Math.max(0, Math.min(1, F.n)), t = F.t;
    var dt = last == null ? 0 : Math.max(0, Math.min(0.1, t - last)); last = t;
    prog += dt * (0.12 + e * S.pace * 1.6);
    if (prog >= 1.12) prog = 0;
    var raw = Math.min(1, prog), p = (EASE[S.ease] || EASE.smooth)(raw);
    switch (S.variant) {
      case "wipe":   wipe(ctx, W, H, p); break;
      case "radial": radial(ctx, W, H, p); break;
      case "text":   textReveal(ctx, W, H, raw, F.bufX, F.bufX.length); break;
      default:       bar(ctx, W, H, p, S);
    }
  }

  root.Demo = {
    title: "Transitions",
    driver: { x: { src: "sine", rate: 1.2 }, drive: "x" },
    structure: [
      { tier: "structure", key: "variant", label: "Variant", type: "select", value: "bar", options: [
        { value: "bar", label: "Loading bar" }, { value: "wipe", label: "Wipe reveal" }, { value: "radial", label: "Radial fill" }, { value: "text", label: "Text reveal" } ] },
      { tier: "structure", key: "width", label: "Bar width", type: "slider", min: 0.3, max: 0.8, step: 0.02, value: 0.7, fmt: function (v) { return Math.round(v * 100) + "%"; }, when: { variant: "bar" } }
    ],
    shaping: [
      { tier: "shaping", key: "pace", label: "Signal pace", type: "slider", min: 0, max: 1, step: 0.01, value: 0.6, fmt: function (v) { return (+v).toFixed(2); } },
      { tier: "shaping", key: "ease", label: "Easing", type: "select", value: "smooth", options: [
        { value: "linear", label: "Linear" }, { value: "smooth", label: "Smooth" }, { value: "in", label: "Ease in" }, { value: "out", label: "Ease out" } ] }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
