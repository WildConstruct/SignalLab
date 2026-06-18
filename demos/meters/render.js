/*
 * METERS — Bar meter + gate (MVP)  (demos/meters/render.js)
 * Ported from tool/index.html `case "meter"`. A calibrated readout: fill follows
 * the signal through a response curve (gamma), redlines past the threshold, and
 * the gate dot keys off n >= 0.5. Reads only n.
 */
(function (root) {
  "use strict";
  var peak = 0;

  function render(ctx, W, H, F) {
    var S = F.S, n = Math.max(0, Math.min(1, F.n));
    var f = Math.pow(n, S.gamma);             // response curve
    var red = S.redline;
    peak = Math.max(f, peak - 0.006);         // peak-hold w/ slow decay

    var cx = W / 2, bw = 90, bh = Math.min(H * 0.7, 260), x = cx - bw / 2, y = (H + bh) / 2;
    ctx.strokeStyle = "#1d2a34"; ctx.lineWidth = 1; ctx.strokeRect(x, y - bh, bw, bh);
    ctx.fillStyle = f > red ? "#f0683a" : "#36f09a"; ctx.fillRect(x, y - bh * f, bw, bh * f);
    // peak-hold tick
    ctx.fillStyle = "#eaf6f5"; ctx.fillRect(x, y - bh * peak - 1, bw, 2);
    // redline marker
    ctx.strokeStyle = "#5a2a20"; ctx.beginPath(); ctx.moveTo(x, y - bh * red); ctx.lineTo(x + bw, y - bh * red); ctx.stroke();
    // gate dot
    ctx.fillStyle = (n >= 0.5) ? "#f0683a" : "#16221c"; ctx.beginPath(); ctx.arc(cx, y - bh - 26, 11, 0, 7); ctx.fill();
  }

  root.Demo = {
    title: "Meters — Bar + Gate",
    driver: { x: { src: "sine", rate: 1 }, y: { src: "noise", rate: 2 }, drive: "max" },
    structure: [],
    shaping: [
      { tier: "shaping", key: "gamma",   label: "Response <span>γ</span>", type: "slider", min: 0.3, max: 3, step: 0.05, value: 1, fmt: function (v) { return (+v).toFixed(2); } },
      { tier: "shaping", key: "redline", label: "Redline ≥", type: "slider", min: 0.5, max: 1, step: 0.01, value: 0.85, fmt: function (v) { return (+v).toFixed(2); } }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
