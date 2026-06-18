/*
 * GLITCH / DISTORTION — sync drift + block displacement (demos/glitch-distortion/render.js)
 * -------------------------------------------------------------------------
 * The image is the foreground; the signal subtly corrupts it. MVP gave RGB
 * chroma split + sync jitter + scanlines. Phase 2 adds BLOCK DISPLACEMENT: the
 * frame is sliced into horizontal blocks each shoved sideways by the raw signal
 * buffer (datamosh / torn-tape look), with a Block size control. Reads only n
 * for energy + bufX for per-block offsets. Params mirror the Cathode plugin.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";

  // Luminance test pattern, single colour, so 3 tinted passes ('lighter') = RGB split.
  function pattern(ctx, W, H, dx, color) {
    var cx = W / 2, cy = H / 2;
    ctx.save(); ctx.translate(dx, 0);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
    var step = Math.max(28, Math.min(W, H) / 14);
    ctx.globalAlpha = 0.35;
    for (var x = cx % step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = cy % step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.globalAlpha = 0.9;
    var R = Math.min(W, H) * 0.36;
    for (var r = R; r > 8; r -= R / 5) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    var bw = W * 0.62, bx = cx - bw / 2, by = cy + R * 0.62, bh = Math.min(40, H * 0.06);
    for (var i = 0; i < 8; i++) { ctx.globalAlpha = 0.15 + i * 0.1; ctx.fillRect(bx + i * bw / 8, by, bw / 8 - 1, bh); }
    ctx.globalAlpha = 1;
    ctx.font = "700 " + Math.round(Math.min(W, H) * 0.05) + "px ui-monospace,monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("SIGNAL RACK", cx, cy - R * 0.62);
    ctx.restore();
  }

  // One RGB-split draw of the whole card at horizontal offset dx.
  function drawRGB(ctx, W, H, dx, chroma) {
    var prev = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
    pattern(ctx, W, H, dx + chroma, "#ff2a2a");
    pattern(ctx, W, H, dx, "#2aff7a");
    pattern(ctx, W, H, dx - chroma, "#2a7aff");
    ctx.globalCompositeOperation = prev;
  }

  function render(ctx, W, H, F) {
    var S = F.S, bx = F.bufX, L = bx.length, e = root.SignalShaping.response(Math.max(0, Math.min(1, F.n)), S), t = F.t;
    var chroma = e * S.chroma;
    var stepN = Math.floor(t * 14); var jh = Math.sin(stepN * 91.7) * 43758.5453; jh -= Math.floor(jh);
    var sync = (jh - 0.5) * 2 * e * S.drift;
    var blockAmt = S.block, bs = Math.max(8, S.bsize);

    ctx.fillStyle = "#05080a"; ctx.fillRect(0, 0, W, H);

    if (blockAmt > 0.5) {
      // slice into horizontal blocks; each shoved by a raw buffer sample
      var bands = Math.ceil(H / bs);
      for (var b = 0; b < bands; b++) {
        var y = b * bs, idx = Math.floor((b / bands) * (L - 1));
        var dx = sync + (bx[idx] * 2 - 1) * blockAmt * e;
        ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, bs); ctx.clip();
        drawRGB(ctx, W, H, dx, chroma);
        ctx.restore();
      }
    } else {
      drawRGB(ctx, W, H, sync, chroma);
    }

    if (e > 0.78) { var ty = (t * 0.35 % 1) * H, th = H * 0.05;
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, ty, W, th);
      ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(0, ty + th * 0.4, W, 1); }

    var d = Math.max(2, Math.round(S.scan));
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    for (var sy = 0; sy < H; sy += d) ctx.fillRect(0, sy, W, 1);
  }

  root.Demo = {
    title: "Glitch / Distortion",
    driver: { x: { src: "randomWalk", rate: 1.2 }, y: { src: "sine", rate: 0.6 }, drive: "max" },
    structure: [
      { tier: "structure", key: "scan",  label: "Scanline gap <span>px</span>", type: "slider", min: 2, max: 10, step: 1, value: 3 },
      { tier: "structure", key: "bsize", label: "Block size <span>px</span>",    type: "slider", min: 8, max: 80, step: 2, value: 24 }
    ],
    shaping: [
      { tier: "shaping", key: "chroma", label: "Chroma phase <span>px</span>",  type: "slider", min: 0, max: 40, step: 1, value: 14 },
      { tier: "shaping", key: "drift",  label: "Sync drift <span>px</span>",     type: "slider", min: 0, max: 120, step: 1, value: 48 },
      { tier: "shaping", key: "block",  label: "Block displace <span>px</span>", type: "slider", min: 0, max: 200, step: 2, value: 0, fmt: function (v) { return v > 0.5 ? v : "off"; } }
    ].concat(root.SignalShaping.responseSpecs({ gamma: 1 })),
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
