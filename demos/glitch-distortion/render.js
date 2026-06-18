/*
 * GLITCH / DISTORTION — Broadcast sync drift (MVP)  (demos/glitch-distortion/render.js)
 * -------------------------------------------------------------------------
 * The purest "signal in the background" case: a foreground image (here a
 * procedural NTSC-style test card) that the signal subtly corrupts — RGB
 * chroma split, horizontal sync jitter, scanlines. The signal value `n` is the
 * energy; Shaping decides how much chroma/drift it buys. Renderer reads only n.
 * Mirrors the Cathode/CRT recipe so params transfer to the Cathode plugin.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";

  // One luminance test pattern, stroked/filled in a single colour so three
  // tinted passes with 'lighter' recombine into an RGB-split image.
  function pattern(ctx, W, H, dx, dy, color) {
    var cx = W / 2, cy = H / 2;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
    // grid
    var step = Math.max(28, Math.min(W, H) / 14);
    ctx.globalAlpha = 0.35;
    for (var x = cx % step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = cy % step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.globalAlpha = 0.9;
    // concentric circles
    var R = Math.min(W, H) * 0.36;
    for (var r = R; r > 8; r -= R / 5) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
    // crosshair
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    // greyscale bar
    var bw = W * 0.62, bx = cx - bw / 2, by = cy + R * 0.62, bh = Math.min(40, H * 0.06);
    for (var i = 0; i < 8; i++) { ctx.globalAlpha = 0.15 + i * 0.1; ctx.fillRect(bx + i * bw / 8, by, bw / 8 - 1, bh); }
    ctx.globalAlpha = 1;
    // label
    ctx.font = "700 " + Math.round(Math.min(W, H) * 0.05) + "px ui-monospace,monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("SIGNAL RACK", cx, cy - R * 0.62);
    ctx.restore();
  }

  function render(ctx, W, H, F) {
    var S = F.S, e = Math.max(0, Math.min(1, F.n)), t = F.t;
    var chroma = e * S.chroma;
    // steppy sync jitter (sample-and-hold) so it reads as broadcast roll
    var step = Math.floor(t * 14);
    var jh = Math.sin(step * 91.7) * 43758.5453; jh -= Math.floor(jh);
    var sync = (jh - 0.5) * 2 * e * S.drift;

    ctx.fillStyle = "#05080a"; ctx.fillRect(0, 0, W, H);
    var prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    pattern(ctx, W, H, sync + chroma, 0, "#ff2a2a");   // R
    pattern(ctx, W, H, sync, 0, "#2aff7a");            // G
    pattern(ctx, W, H, sync - chroma, 0, "#2a7aff");   // B
    ctx.globalCompositeOperation = prev;

    // tear band on peaks (dropout preview)
    if (e > 0.78) {
      var ty = (t * 0.35 % 1) * H, th = H * 0.05;
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, ty, W, th);
      ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(0, ty + th * 0.4, W, 1);
    }

    // scanlines
    var d = Math.max(2, Math.round(S.scan));
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    for (var y = 0; y < H; y += d) ctx.fillRect(0, y, W, 1);
  }

  root.Demo = {
    title: "Glitch — Broadcast Sync Drift",
    driver: { x: { src: "randomWalk", rate: 1.2 }, y: { src: "sine", rate: 0.6 }, drive: "max" },
    structure: [
      { tier: "structure", key: "scan", label: "Scanline gap <span>px</span>", type: "slider", min: 2, max: 10, step: 1, value: 3 }
    ],
    shaping: [
      { tier: "shaping", key: "chroma", label: "Chroma phase <span>px</span>", type: "slider", min: 0, max: 40, step: 1, value: 14 },
      { tier: "shaping", key: "drift",  label: "Sync drift <span>px</span>",   type: "slider", min: 0, max: 120, step: 1, value: 48 }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
