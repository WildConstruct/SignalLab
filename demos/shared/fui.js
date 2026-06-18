/*
 * SIGNAL RACK — FUI primitive kit  (demos/shared/fui.js)
 * -------------------------------------------------------------------------
 * A small set of reusable, signal-aware draw helpers so FUI widgets compose
 * from shared parts instead of re-implementing arcs / ticks / cells / brackets.
 * This is the foundation for building richer widget collections later — a
 * curated library, NOT a drag-and-drop builder. Existing widgets are untouched;
 * new ones build on this.
 *
 * Convention: helpers take (ctx, geometry…, opts?) and use the shared green
 * "signal" glow. `v` is a 0..1 signal value; `fire` an optional lit threshold.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var GLOW = "#36f09a";

  // signal value → fill colour (the shared lit-cell look)
  function lit(v, fire) { return v > (fire || 0) ? "hsl(" + (150 + v * 120) + ",85%," + (28 + v * 45) + "%)" : "#0e1a1f"; }

  // a rectangular cell with optional glow when lit
  function cell(ctx, x, y, w, h, v, fire, glow) {
    var on = v > (fire || 0);
    ctx.fillStyle = on ? lit(v, fire) : "#0e1a1f";
    if (on && glow !== 0) { ctx.shadowColor = GLOW; ctx.shadowBlur = (glow || 10) * v; }
    ctx.fillRect(x, y, w, h); ctx.shadowBlur = 0;
  }

  // a flat-top hexagon (circumradius r), lit like a cell
  function hexCell(ctx, cx, cy, r, v, fire, glow) {
    var on = v > (fire || 0);
    ctx.beginPath();
    for (var i = 0; i < 6; i++) { var a = Math.PI / 180 * (60 * i - 30), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
    ctx.fillStyle = on ? lit(v, fire) : "#0e1a1f";
    if (on && glow !== 0) { ctx.shadowColor = GLOW; ctx.shadowBlur = (glow || 10) * v; }
    ctx.fill(); ctx.shadowBlur = 0;
  }

  // ring of radial tick marks
  function tickRing(ctx, cx, cy, r, count, opts) {
    opts = opts || {}; ctx.strokeStyle = opts.color || "#1f5e4e"; ctx.lineWidth = opts.lw || 1;
    var inner = r - (opts.len || 6);
    for (var i = 0; i < count; i++) { var a = i / count * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); }
  }

  // stroked arc (optionally glowing)
  function arc(ctx, cx, cy, r, a0, a1, opts) {
    opts = opts || {}; ctx.strokeStyle = opts.color || GLOW; ctx.lineWidth = opts.lw || 2; ctx.lineCap = opts.cap || "butt";
    if (opts.glow) { ctx.shadowColor = opts.color || GLOW; ctx.shadowBlur = opts.glow; }
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke(); ctx.shadowBlur = 0; ctx.lineCap = "butt";
  }

  // corner brackets around a box (reticle / callout frame)
  function bracket(ctx, x, y, w, h, len, opts) {
    opts = opts || {}; ctx.strokeStyle = opts.color || GLOW; ctx.lineWidth = opts.lw || 2;
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(function (p) {
      ctx.beginPath(); ctx.moveTo(p[0] + p[2] * len, p[1]); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0], p[1] + p[3] * len); ctx.stroke();
    });
  }

  // gauge needle from a hub
  function needle(ctx, cx, cy, r, ang, opts) {
    opts = opts || {}; ctx.strokeStyle = opts.color || "#dff"; ctx.lineWidth = opts.lw || 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.stroke();
    ctx.fillStyle = opts.color || "#dff"; ctx.beginPath(); ctx.arc(cx, cy, opts.hub || 5, 0, 7); ctx.fill();
  }

  // mono readout text
  function readout(ctx, x, y, text, opts) {
    opts = opts || {}; ctx.font = (opts.size || 12) + "px ui-monospace,monospace";
    ctx.fillStyle = opts.color || "#7df0c2"; ctx.textAlign = opts.align || "left"; ctx.textBaseline = opts.baseline || "alphabetic";
    ctx.fillText(text, x, y); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  root.FUI = { lit: lit, cell: cell, hexCell: hexCell, tickRing: tickRing, arc: arc, bracket: bracket, needle: needle, readout: readout, GLOW: GLOW };
})(typeof self !== "undefined" ? self : this);
