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
  var Shaping = root.SignalShaping, FUI = root.FUI, peakHold = new Shaping.PeakHold(0.006), peak = 0;

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
  // fixed segment size; the ladder grows with the segment count (scales down only to fit)
  function ledLadder(ctx, W, H, f, segs) {
    var cx = W / 2, cy = H / 2, bw = 54, seg0 = 14, gap0 = 4;
    var ladderH = segs * seg0 + (segs - 1) * gap0, fit = Math.min(1, (H * 0.82) / ladderH);
    var sh = seg0 * fit, gap = gap0 * fit, areaH = segs * sh + (segs - 1) * gap;
    var x = cx - bw / 2, y0 = cy + areaH / 2, lit = Math.round(f * segs), litPk = Math.round(peak * segs);
    for (var i = 0; i < segs; i++) {
      var frac = i / segs, col = frac > 0.85 ? "#f0683a" : frac > 0.6 ? "#f0c23a" : "#36f09a";
      ctx.fillStyle = i < lit ? col : "#16242c"; ctx.globalAlpha = i < lit ? 1 : 0.5;
      if (i === litPk - 1) { ctx.fillStyle = "#eaf6f5"; ctx.globalAlpha = 1; }   // peak-hold segment
      ctx.fillRect(x, y0 - (i + 1) * sh - i * gap, bw, sh);
    }
    ctx.globalAlpha = 1;
  }

  // VU dial — needle meter, reusing the fui.js kit (arc / needle)
  function vuDial(ctx, W, H, f, red) {
    var cx = W / 2, cy = H * 0.66, R = Math.min(W, H) * 0.4, a0 = Math.PI * 1.25, a1 = Math.PI * 1.75;
    FUI.arc(ctx, cx, cy, R, a0, a1, { color: "#16222b", lw: 3 });
    for (var i = 0; i <= 10; i++) { var a = a0 + (a1 - a0) * (i / 10), hot = i / 10 >= red, inner = R - (hot ? 13 : 8);
      ctx.strokeStyle = hot ? "#f0683a" : "#2a4a44"; ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
    var ap = a0 + (a1 - a0) * peak; ctx.strokeStyle = "#eaf6f5"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(ap) * R * 0.82, cy + Math.sin(ap) * R * 0.82); ctx.lineTo(cx + Math.cos(ap) * R, cy + Math.sin(ap) * R); ctx.stroke();
    FUI.needle(ctx, cx, cy, R * 0.92, a0 + (a1 - a0) * f, { color: f > red ? "#f0683a" : "#dff", lw: 2, hub: 6 });
    FUI.readout(ctx, cx, cy + 26, "VU", { color: "#56565d", size: 12, align: "center" });
  }
  // Goniometer — plots the two signal channels (L=X, R=Y) rotated 45° (mono → vertical)
  function goniometer(ctx, W, H, F) {
    var bx = F.bufX, by = F.bufY, L = bx.length, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.4;
    FUI.arc(ctx, cx, cy, R, 0, Math.PI * 2, { color: "#16323f", lw: 1 });
    ctx.strokeStyle = "#16323f"; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    ctx.strokeStyle = "#36f09a"; ctx.lineWidth = 1; ctx.globalAlpha = 0.85; ctx.beginPath();
    for (var i = 0; i < L; i++) { var l = bx[i] * 2 - 1, rr = by[i] * 2 - 1, gx = (l - rr) * 0.7071, gy = (l + rr) * 0.7071;
      var px = cx + gx * R, py = cy - gy * R; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke(); ctx.globalAlpha = 1;
    FUI.readout(ctx, cx, cy + R + 16, "GONIOMETER · L/R PHASE", { color: "#56565d", size: 10, align: "center" });
  }

  function render(ctx, W, H, F) {
    var S = F.S, n = Math.max(0, Math.min(1, F.n)), f = Shaping.response(n, S), red = S.redline;
    peak = peakHold.push(f);
    switch (S.variant) {
      case "radial": radialGauge(ctx, W, H, f, red); break;
      case "led":    ledLadder(ctx, W, H, f, Math.max(4, Math.round(S.segs))); break;
      case "dial":   vuDial(ctx, W, H, f, red); break;
      case "gonio":  goniometer(ctx, W, H, F); break;
      default:       barMeter(ctx, W, H, n, f, red);
    }
  }

  root.Demo = {
    title: "Meters",
    driver: { x: { src: "sine", rate: 1 }, y: { src: "noise", rate: 2 }, drive: "max" },
    structure: [
      { tier: "structure", key: "variant", label: "Meter type", type: "select", value: "bar", options: [
        { value: "bar", label: "Bar + gate" }, { value: "radial", label: "Radial gauge" }, { value: "led", label: "LED ladder" }, { value: "dial", label: "VU dial" }, { value: "gonio", label: "Goniometer" } ] },
      { tier: "structure", key: "segs", label: "Segments", type: "slider", min: 6, max: 28, step: 1, value: 16, when: { variant: "led" } }
    ],
    shaping: root.SignalShaping.responseSpecs({ gamma: 1 }).concat([
      { tier: "shaping", key: "redline", label: "Redline ≥", type: "slider", min: 0.5, max: 1, step: 0.01, value: 0.85, fmt: function (v) { return (+v).toFixed(2); } }
    ]),
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
