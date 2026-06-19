/*
 * SIGNAL RACK — lissajous / parametric engine driver  (demos/shared/lissajous.js)
 * -------------------------------------------------------------------------
 * Reusable ENGINE driver: a parametric curve x(t),y(t)[,z(t)] from frequency
 * ratios + phase. Deterministic, already normalized to [-1,1] (sines). Tools
 * SURFACE the ratios/phase (and may drive phase with the signal); renderers plot
 * (2D) or project (3D via proj3). Shared by Path & Scope and Meters.
 *
 *   Lissajous.trace({a,b,c,delta,delta2,dim}, {n,cycles}) -> { pts:[[x,y,z]], dim }
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Lissajous = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function trace(p, opts) {
    p = p || {}; opts = opts || {};
    var a = p.a != null ? p.a : 3, b = p.b != null ? p.b : 2, c = p.c != null ? p.c : 4;
    var delta = p.delta || 0, delta2 = p.delta2 != null ? p.delta2 : Math.PI / 2, dim = p.dim === 3 ? 3 : 2;
    var n = opts.n || 1200, cycles = opts.cycles || 1, pts = [];
    for (var i = 0; i <= n; i++) {
      var th = i / n * Math.PI * 2 * cycles;
      pts.push([Math.sin(a * th + delta), Math.sin(b * th), dim === 3 ? Math.sin(c * th + delta2) : 0]);
    }
    return { pts: pts, dim: dim };
  }
  return { trace: trace };
});
