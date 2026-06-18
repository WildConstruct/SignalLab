/*
 * METERS — bar / radial gauge / LED ladder  (demos/meters/render.js)
 * -------------------------------------------------------------------------
 * Calibrated readouts. A variant picker switches between ports of tool's
 * meter / meterRadial / meterLED. The signal passes through a response curve
 * (gamma), peak-holds, and redlines past a threshold. Reads only n.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var Shaping = root.SignalShaping, peakHold = new Shaping.PeakHold(0.006), peak = 0;

  function barMeter(ctx, W, H, n, f, red) {
    var cx = W / 2, bw = 90, bh = Math.min(H * 0.7, 260), x = cx - bw / 2, y = (H + bh) / 2;
    ctx.strokeStyle = "#1d2a34"; ctx.lineWidth = 1; ctx.strokeRect(x, y - bh, bw, bh);
    ctx.fillStyle = f > red ? "#f0683a" : "#36f09a"; ctx.fillRect(x, y - bh * f, bw, bh * f);
    ctx.fillStyle = "#eaf6f5"; ctx.fillRect(x, y - bh * peak - 1, bw, 2);
    ctx.strokeStyle = "#5a2a20"; ctx.beginPath(); ctx.moveTo(x, y - bh * red); ctx.lineTo(x + bw, y - bh * red); ctx.stroke();
    ctx.fillStyle = (n >= 0.5) ? "#f0683a" : "#16221c"; ctx.beginPath(); ctx.arc(cx, y - bh - 26, 11, 0, 7); ctx.fill();
  }
  function radialGauge(ctx, W, H, f, red) {
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.34, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.strokeStyle = "#16222b"; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
    var a = a0 + (a1 - a0) * f; ctx.strokeStyle = f > red ? "#f0683a" : "#36f09a"; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a); ctx.stroke();
    // peak-hold tick
    var ap = a0 + (a1 - a0) * peak; ctx.strokeStyle = "#eaf6f5"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R, ap - 0.02, ap + 0.02); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = "#dff"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9); ctx.stroke();
    ctx.fillStyle = "#dff"; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill(); ctx.lineCap = "butt";
  }
  function ledLadder(ctx, W, H, f, segs) {
    var cx = W / 2, cy = H / 2, gap = 4, bw = 54, areaH = Math.min(H * 0.74, 300);
    var sh = (areaH - gap * (segs - 1)) / segs, x = cx - bw / 2, y0 = cy + areaH / 2, lit = Math.round(f * segs), litPk = Math.round(peak * segs);
    for (var i = 0; i < segs; i++) {
      var frac = i / segs, col = frac > 0.85 ? "#f0683a" : frac > 0.6 ? "#f0c23a" : "#36f09a";
      ctx.fillStyle = i < lit ? col : "#16242c"; ctx.globalAlpha = i < lit ? 1 : 0.5;
      if (i === litPk - 1) { ctx.fillStyle = "#eaf6f5"; ctx.globalAlpha = 1; }   // peak-hold segment
      ctx.fillRect(x, y0 - (i + 1) * sh - i * gap, bw, sh);
    }
    ctx.globalAlpha = 1;
  }

  function render(ctx, W, H, F) {
    var S = F.S, n = Math.max(0, Math.min(1, F.n)), f = Shaping.response(n, S), red = S.redline;
    peak = peakHold.push(f);
    switch (S.variant) {
      case "radial": radialGauge(ctx, W, H, f, red); break;
      case "led":    ledLadder(ctx, W, H, f, Math.max(4, Math.round(S.segs))); break;
      default:       barMeter(ctx, W, H, n, f, red);
    }
  }

  root.Demo = {
    title: "Meters",
    driver: { x: { src: "sine", rate: 1 }, y: { src: "noise", rate: 2 }, drive: "max" },
    structure: [
      { tier: "structure", key: "variant", label: "Meter type", type: "select", value: "bar", options: [
        { value: "bar", label: "Bar + gate" }, { value: "radial", label: "Radial gauge" }, { value: "led", label: "LED ladder" } ] },
      { tier: "structure", key: "segs", label: "Segments <span>(LED)</span>", type: "slider", min: 6, max: 28, step: 1, value: 16 }
    ],
    shaping: root.SignalShaping.responseSpecs({ gamma: 1 }).concat([
      { tier: "shaping", key: "redline", label: "Redline ≥", type: "slider", min: 0.5, max: 1, step: 0.01, value: 0.85, fmt: function (v) { return (+v).toFixed(2); } }
    ]),
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
