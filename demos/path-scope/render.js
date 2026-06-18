/*
 * PATH & SCOPE — Wave-runner (MVP)  (demos/path-scope/render.js)
 * Ported from tool/index.html `case "trace"`. The raw signal AS geometry: the
 * combined driver is drawn across the window and a glowing head dot rides the
 * live end value. The clearest teaching surface for the Combine selector.
 */
(function (root) {
  "use strict";
  var combine = root.SignalEngine.combine;

  function render(ctx, W, H, F) {
    var S = F.S, bx = F.bufX, by = F.bufY, L = bx.length, mode = S._drive || "x";
    // baseline
    ctx.strokeStyle = "#1d2a34"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    // the driver waveform
    ctx.strokeStyle = "#2a6"; ctx.lineWidth = S.weight;
    ctx.beginPath();
    for (var i = 0; i < L; i++) {
      var dv = combine(mode, bx[i], by[i]);
      var x = i / (L - 1) * W, y = (1 - dv) * (H - 24) + 12;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
    // head dot on the live value
    var dvE = combine(mode, bx[L - 1], by[L - 1]);
    var px = W - 14, py = (1 - dvE) * (H - 24) + 12;
    ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 16; ctx.fillStyle = "#36f09a";
    ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }

  root.Demo = {
    title: "Path & Scope — Wave Runner",
    driver: { x: { src: "sine", rate: 2 }, y: { src: "triangle", rate: 3, phase: 0.1 }, drive: "mult" },
    structure: [
      { tier: "structure", key: "weight", label: "Line weight", type: "slider", min: 1, max: 5, step: 0.5, value: 2, fmt: function (v) { return (+v).toFixed(1); } }
    ],
    shaping: [],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
