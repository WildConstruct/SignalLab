/*
 * TRANSITIONS — Loading bar (MVP)  (demos/transitions/render.js)
 * Ported from tool/index.html `case "trLoad"`. A monotonic progress bar whose
 * fill PACE is shaped by the signal: louder signal → faster climb, but it never
 * regresses (loaders shouldn't visually drop). Reads only n.
 */
(function (root) {
  "use strict";
  var prog = 0, last = null;

  function render(ctx, W, H, F) {
    var S = F.S, e = Math.max(0, Math.min(1, F.n)), t = F.t;
    var dt = last == null ? 0 : Math.max(0, Math.min(0.1, t - last)); last = t;
    var pace = S.pace;
    prog += dt * (0.12 + e * pace * 1.6);     // signal-shaped, always-climbing
    if (prog >= 1.12) prog = 0;               // loop for the demo
    var fill = Math.min(1, prog);

    var cx = W / 2, cy = H / 2;
    var bw = Math.min(W * S.width, 560), bh = Math.min(H * 0.12, 52), x = cx - bw / 2, y = cy - bh / 2;
    ctx.strokeStyle = "#1f5e4e"; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = "#36f09a"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 14;
    ctx.fillRect(x + 3, y + 3, (bw - 6) * fill, bh - 6); ctx.shadowBlur = 0;
    ctx.fillStyle = "#eaf6f5"; ctx.font = "700 " + Math.round(bh * 0.62) + "px ui-monospace,monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(Math.round(fill * 100) + "%", cx, y - bh * 0.7);
    ctx.textBaseline = "alphabetic";
  }

  root.Demo = {
    title: "Transitions — Loading Bar",
    driver: { x: { src: "sine", rate: 1.2 }, drive: "x" },
    structure: [
      { tier: "structure", key: "width", label: "Bar width", type: "slider", min: 0.3, max: 0.8, step: 0.02, value: 0.7, fmt: function (v) { return Math.round(v * 100) + "%"; } }
    ],
    shaping: [
      { tier: "shaping", key: "pace", label: "Signal pace", type: "slider", min: 0, max: 1, step: 0.01, value: 0.6, fmt: function (v) { return (+v).toFixed(2); } }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
