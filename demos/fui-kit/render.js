/*
 * FUI KIT — Synapse net (MVP)  (demos/fui-kit/render.js)
 * -------------------------------------------------------------------------
 * Ported from tool/index.html `case "fuiSynapse"`. A neural-net HUD widget:
 * the signal in the background decides WHICH nodes fire and ripples pulses
 * along the edges between them — the canonical Structure / Signal / Shaping
 * reference. Reads only n / bufX / bufY (via the shared driver); the seed
 * reshapes the whole net, the `Fire ≥` threshold is the shaping control.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var combine = root.SignalEngine.combine;   // exact tool combine() — no signal math here

  function render(ctx, W, H, F) {
    var S = F.S, bx = F.bufX, by = F.bufY, L = bx.length, t = F.t;
    var cx = W / 2, cy = H / 2;
    var seed = (+S.seed || 1) * 0.137;
    function hx(k) { var s = Math.sin(k * 127.1 + 311.7 + seed) * 43758.5453; return s - Math.floor(s); }

    var NODES = Math.max(3, Math.round(S.nodes));
    var deg0 = Math.max(1, Math.round(S.connect));
    var fire = S.fire;
    var mode = S._drive || "mult";

    var pos = [];
    for (var i = 0; i < NODES; i++)
      pos.push([cx + (hx(i) - 0.5) * Math.min(W * 0.84, 820),
                cy + (hx(i + 50) - 0.5) * Math.min(H * 0.74, 440)]);

    function act(i) { var k = Math.floor(hx(i + 9) * (L - 1)); return Math.max(0, Math.min(1, combine(mode, bx[k], by[k]))); }

    // edges (seed-varied connectivity)
    var edges = [];
    for (i = 0; i < NODES; i++) {
      var deg = deg0;   // 1..3 nominal; structure control overrides the seed default
      for (var d = 0; d < deg; d++) { var j = Math.floor(hx(i * 5 + d + 617) * NODES); if (j === i) j = (j + 1) % NODES; edges.push([i, j]); }
    }

    // edges + travelling pulses
    for (var ei = 0; ei < edges.length; ei++) {
      var a = edges[ei][0], b = edges[ei][1], A = pos[a], B = pos[b];
      ctx.strokeStyle = "#15303a"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      var aa = act(a);
      if (aa > Math.max(0.05, fire - 0.1)) {
        var ph = (t * 0.6 + hx(ei * 3)) % 1, x = A[0] + (B[0] - A[0]) * ph, y = A[1] + (B[1] - A[1]) * ph;
        ctx.globalAlpha = aa; ctx.fillStyle = "#7df0c2"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(x, y, 2 + aa * 2, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }

    // nodes + fire rings
    for (i = 0; i < NODES; i++) {
      var av = act(i), P = pos[i], fired = av > fire;
      ctx.fillStyle = fired ? "hsl(" + (150 + av * 120) + ",90%," + (55 + av * 20) + "%)" : "#1b2a30";
      ctx.shadowColor = "#36f09a"; ctx.shadowBlur = fired ? 14 * av : 0;
      ctx.beginPath(); ctx.arc(P[0], P[1], 4 + av * 8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      if (fired) {
        var rp = (t * 1.5 + i) % 1;
        ctx.strokeStyle = "rgba(54,240,154," + (av * (1 - rp)) + ")"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(P[0], P[1], 8 + 24 * rp, 0, 7); ctx.stroke();
      }
    }
  }

  root.Demo = {
    title: "FUI Kit — Synapse Net",
    driver: { x: { src: "sine", rate: 1.5 }, y: { src: "sine", rate: 2, phase: 0.1 }, drive: "mult" },
    structure: [
      { tier: "structure", key: "nodes",   label: "Nodes",        type: "slider", min: 6, max: 24, step: 1, value: 15 },
      { tier: "structure", key: "connect", label: "Connectivity", type: "slider", min: 1, max: 3, step: 1, value: 2 },
      { tier: "structure", key: "seed",    label: "Seed",         type: "slider", min: 1, max: 9999, step: 1, value: 1941 }
    ],
    shaping: [
      { tier: "shaping", key: "fire", label: "Fire ≥ <span>threshold</span>", type: "slider", min: 0, max: 1, step: 0.01, value: 0.45, fmt: function (v) { return (+v).toFixed(2); } }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
