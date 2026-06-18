/*
 * FUI KIT — Synapse net + Data packets + Processor die  (demos/fui-kit/render.js)
 * -------------------------------------------------------------------------
 * HUD widgets where the signal in the background decides WHICH elements fire
 * and in what sequence. Widget picker switches between three ports of
 * tool/index.html: `fuiSynapse`, `fuiPackets`, `fuiCore`. Renderers read only
 * n / bufX / bufY (via the shared driver); seed reshapes structure, `Fire ≥`
 * is the shaping control. No signal math here — uses the engine's combine().
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var combine = root.SignalEngine.combine, Shaping = root.SignalShaping;

  function synapse(ctx, W, H, F) {
    var S = F.S, t = F.t;
    var cx = W / 2, cy = H / 2, seed = (+S.seed || 1) * 0.137;
    function hx(k) { var s = Math.sin(k * 127.1 + 311.7 + seed) * 43758.5453; return s - Math.floor(s); }
    var NODES = Math.max(3, Math.round(S.nodes)), deg0 = Math.max(1, Math.round(S.connect)), fire = S.fire;
    var prop = S.propag != null ? S.propag : 0.6, seqAmt = S.seq || 0;
    var pos = [];
    for (var i = 0; i < NODES; i++) pos.push([cx + (hx(i) - 0.5) * Math.min(W * 0.84, 820), cy + (hx(i + 50) - 0.5) * Math.min(H * 0.74, 440)]);
    // per-node sequencing envelope → nodes fire in a travelling sequence
    function seqEnv(i) { return seqAmt <= 0 ? 1 : (1 - seqAmt) + seqAmt * (0.5 + 0.5 * Math.sin(t * prop * 3 - i * 1.1)); }
    // field map decides which point of the signal each node reads (default: stagger)
    function act(i) { return Math.max(0, Math.min(1, Shaping.fieldValue(F, i, NODES, Math.round(+S.seed || 0) + 9) * seqEnv(i))); }
    var edges = [];
    for (i = 0; i < NODES; i++) for (var d = 0; d < deg0; d++) { var j = Math.floor(hx(i * 5 + d + 617) * NODES); if (j === i) j = (j + 1) % NODES; edges.push([i, j]); }
    for (var ei = 0; ei < edges.length; ei++) {
      var a = edges[ei][0], b = edges[ei][1], A = pos[a], B = pos[b];
      ctx.strokeStyle = "#15303a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      var aa = act(a);
      if (aa > Math.max(0.05, fire - 0.1)) { var ph = (t * prop + hx(ei * 3)) % 1, x = A[0] + (B[0] - A[0]) * ph, y = A[1] + (B[1] - A[1]) * ph;
        ctx.globalAlpha = aa; ctx.fillStyle = "#7df0c2"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x, y, 2 + aa * 2, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; }
    }
    for (i = 0; i < NODES; i++) {
      var av = act(i), P = pos[i], fired = av > fire;
      ctx.fillStyle = fired ? "hsl(" + (150 + av * 120) + ",90%," + (55 + av * 20) + "%)" : "#1b2a30";
      ctx.shadowColor = "#36f09a"; ctx.shadowBlur = fired ? 14 * av : 0;
      ctx.beginPath(); ctx.arc(P[0], P[1], 4 + av * 8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      if (fired) { var rp = (t * 1.5 + i) % 1; ctx.strokeStyle = "rgba(54,240,154," + (av * (1 - rp)) + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P[0], P[1], 8 + 24 * rp, 0, 7); ctx.stroke(); }
    }
  }

  function packets(ctx, W, H, F) {
    var S = F.S, bx = F.bufX, L = bx.length, e = Math.max(0, Math.min(1, F.n)), t = F.t;
    var cy = H / 2, seed = Math.round(+S.seed || 0), fire = S.fire;
    var lanes = 8, span = Math.min(H * 0.8, 440), laneH = span / lanes, y0 = cy - span / 2;
    ctx.font = "11px ui-monospace,monospace"; ctx.textBaseline = "middle";
    for (var Ln = 0; Ln < lanes; Ln++) {
      var ly = y0 + laneH * (Ln + 0.5), actS = Math.max(0, Math.min(1, bx[(Math.floor((Ln / lanes) * L) + seed * 7) % L]));
      ctx.strokeStyle = "#11242b"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(64, ly); ctx.lineTo(W - 30, ly); ctx.stroke();
      ctx.fillStyle = actS > fire ? "#7df0c2" : "#2a4a44"; ctx.textAlign = "right";
      ctx.fillText("0x" + (((Ln * 16 + seed * 16) & 255).toString(16).toUpperCase().padStart(2, "0")), 56, ly);
      var speed = 0.05 + (Ln % 3) * 0.018 + e * 0.11;
      for (var k = 0; k < 3; k++) { if (actS <= fire + k * 0.16) continue; var ph = ((t * speed + Ln * 0.13 + k * 0.34) % 1), x = 64 + ph * (W - 94);
        ctx.fillStyle = "#7df0c2"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8; ctx.fillRect(x - 7, ly - 3, 14, 6); ctx.shadowBlur = 0; }
    }
    ctx.textBaseline = "alphabetic";
  }

  function core(ctx, W, H, F) {
    var S = F.S, bx = F.bufX, L = bx.length, t = F.t;
    var cx = W / 2, cy = H / 2, seed = Math.round(+S.seed || 0), fire = S.fire;
    var cols = 10, rows = 7, gap = 4, total = Math.min(W * 0.8, 560), cw = (total - gap * (cols - 1)) / cols;
    var gh = Math.min(H * 0.7, 380), chh = (gh - gap * (rows - 1)) / rows, x0 = cx - total / 2, y0 = cy - gh / 2;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var i = r * cols + c, v = Math.max(0, Math.min(1, bx[(i * 37 + seed * 13) % L] * (0.6 + 0.4 * Math.sin(t * 3 + i + seed)))), on = v > fire;
      ctx.fillStyle = on ? "hsl(" + (150 + v * 120) + ",85%," + (28 + v * 42) + "%)" : "#0e1a1f";
      if (on) { ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 10 * v; }
      ctx.fillRect(x0 + c * (cw + gap), y0 + r * (chh + gap), cw, chh); ctx.shadowBlur = 0;
    }
    ctx.strokeStyle = "#1f5e4e"; ctx.lineWidth = 1.5; ctx.strokeRect(x0 - 6, y0 - 6, total + 12, gh + 12);
  }

  var WIDGETS = { synapse: synapse, packets: packets, core: core };
  function render(ctx, W, H, F) { (WIDGETS[F.S.widget] || synapse)(ctx, W, H, F); }

  root.Demo = {
    title: "FUI Kit",
    driver: { x: { src: "sine", rate: 1.5 }, y: { src: "sine", rate: 2, phase: 0.1 }, drive: "mult" },
    structure: [
      { tier: "structure", key: "widget",  label: "Widget", type: "select", value: "synapse", options: [
        { value: "synapse", label: "Synapse net" }, { value: "packets", label: "Data packets" }, { value: "core", label: "Processor die" } ] },
      { tier: "structure", key: "nodes",   label: "Nodes <span>(synapse)</span>",        type: "slider", min: 6, max: 24, step: 1, value: 15 },
      { tier: "structure", key: "connect", label: "Connectivity <span>(synapse)</span>", type: "slider", min: 1, max: 3, step: 1, value: 2 },
      { tier: "structure", key: "seed",    label: "Seed", type: "slider", min: 1, max: 9999, step: 1, value: 1941 }
    ],
    shaping: [
      root.SignalShaping.fieldSpec("stagger"),
      { tier: "shaping", key: "fire",   label: "Fire ≥ <span>threshold</span>", type: "slider", min: 0, max: 1, step: 0.01, value: 0.45, fmt: function (v) { return (+v).toFixed(2); } },
      { tier: "shaping", key: "propag", label: "Edge speed <span>(synapse)</span>", type: "slider", min: 0.1, max: 3, step: 0.05, value: 0.6, fmt: function (v) { return (+v).toFixed(2); } },
      { tier: "shaping", key: "seq",    label: "Sequencing <span>(synapse)</span>", type: "slider", min: 0, max: 1, step: 0.01, value: 0, fmt: function (v) { return (+v).toFixed(2); } }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
