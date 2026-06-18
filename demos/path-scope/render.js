/*
 * PATH & SCOPE — wave / vectorscope / spirograph / rose  (demos/path-scope/render.js)
 * -------------------------------------------------------------------------
 * The raw signal AS geometry. A variant picker switches between ports of tool's
 * trace / orbitPath / spiro / rose. Best surface to feel the Combine selector
 * and the raw buffers. Reads bufX/bufY directly + n for the rose petal count.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var combine = root.SignalEngine.combine;

  function waveRunner(ctx, W, H, F, mode) {
    var bx = F.bufX, by = F.bufY, L = bx.length;
    ctx.strokeStyle = "#1d2a34"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.strokeStyle = "#2a6"; ctx.lineWidth = F.S.weight; ctx.beginPath();
    for (var i = 0; i < L; i++) { var dv = combine(mode, bx[i], by[i]), x = i / (L - 1) * W, y = (1 - dv) * (H - 24) + 12; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    var dvE = combine(mode, bx[L - 1], by[L - 1]), px = W - 14, py = (1 - dvE) * (H - 24) + 12;
    ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 16; ctx.fillStyle = "#36f09a"; ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  function vectorscope(ctx, W, H, F) {
    var bx = F.bufX, by = F.bufY, L = bx.length, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.4 * F.S.radius;
    ctx.strokeStyle = "#16323f"; ctx.lineWidth = 1; ctx.beginPath();
    for (var i = 0; i < L; i++) { var x = cx + (bx[i] * 2 - 1) * R, y = cy - (by[i] * 2 - 1) * R; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    var hx = cx + (bx[L - 1] * 2 - 1) * R, hy = cy - (by[L - 1] * 2 - 1) * R;
    ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 16; ctx.fillStyle = "#36f09a"; ctx.beginPath(); ctx.arc(hx, hy, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  function spirograph(ctx, W, H, F) {
    var bx = F.bufX, L = bx.length, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42 * F.S.radius, turns = Math.max(1, F.S.turns);
    ctx.strokeStyle = "#36f09a"; ctx.lineWidth = 1.4; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8; ctx.beginPath();
    for (var i = 0; i < L; i++) { var a = i / (L - 1) * Math.PI * 2 * turns, rr = R * (0.18 + 0.82 * bx[i]), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  function rose(ctx, W, H, F) {
    var bx = F.bufX, L = bx.length, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42 * F.S.radius;
    var k = Math.round(F.S.turns) || (3 + Math.round(Math.max(0, Math.min(1, F.n)) * 4));
    ctx.strokeStyle = "#36f09a"; ctx.lineWidth = 1.5; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8; ctx.beginPath();
    for (var i = 0; i <= L; i++) { var th = i / L * Math.PI * 2, rr = R * Math.abs(Math.cos(k * th)) * (0.3 + 0.7 * bx[i % L]), x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke(); ctx.shadowBlur = 0;
  }

  function render(ctx, W, H, F) {
    var mode = F.S._drive || "x";
    switch (F.S.variant) {
      case "vector": vectorscope(ctx, W, H, F); break;
      case "spiro":  spirograph(ctx, W, H, F); break;
      case "rose":   rose(ctx, W, H, F); break;
      default:       waveRunner(ctx, W, H, F, mode);
    }
  }

  root.Demo = {
    title: "Path & Scope",
    driver: { x: { src: "sine", rate: 2 }, y: { src: "triangle", rate: 3, phase: 0.1 }, drive: "mult" },
    structure: [
      { tier: "structure", key: "variant", label: "Path type", type: "select", value: "wave", options: [
        { value: "wave", label: "Wave runner" }, { value: "vector", label: "Vectorscope" }, { value: "spiro", label: "Spirograph" }, { value: "rose", label: "Rose curve" } ] },
      { tier: "structure", key: "turns",  label: "Turns / petals", type: "slider", min: 1, max: 10, step: 1, value: 4 },
      { tier: "structure", key: "radius", label: "Radius", type: "slider", min: 0.4, max: 1.2, step: 0.05, value: 1, fmt: function (v) { return (+v).toFixed(2); } },
      { tier: "structure", key: "weight", label: "Line weight <span>(wave)</span>", type: "slider", min: 1, max: 5, step: 0.5, value: 2, fmt: function (v) { return (+v).toFixed(1); } }
    ],
    shaping: [],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
