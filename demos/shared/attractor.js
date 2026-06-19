/*
 * SIGNAL RACK — attractor engine driver  (demos/shared/attractor.js)
 * -------------------------------------------------------------------------
 * A reusable ENGINE driver that integrates strange attractors into a point
 * stream. Deterministic given (system, params) — no randomness — so it is
 * parity-friendly and reproducible, like signal-engine. Tools SURFACE the
 * params (and may perturb them with the signal); renderers consume the points
 * (2D directly, 3D via proj3). Shared by Path & Scope and Particles.
 *
 *   Attractor.trace(system, params, opts) -> { pts: [[x,y,z],…], dim }
 *     system: "lorenz" | "aizawa" | "thomas" | "dejong" | "clifford"
 *     params: overrides for the system constants (see DEFAULTS)
 *     opts:   { n=1400, warmup=300, dt=system default, normalize=true }
 *   Points are centred + scaled to ~[-1,1] (normalize) for uniform rendering.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Attractor = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SYS = {
    // continuous systems (ODE, Euler-integrated)
    lorenz: { dim: 3, kind: "ode", dt: 0.006, start: [0.1, 0, 0], defaults: { a: 10, b: 28, c: 8 / 3 },
      d: function (s, p) { return [p.a * (s[1] - s[0]), s[0] * (p.b - s[2]) - s[1], s[0] * s[1] - p.c * s[2]]; } },
    aizawa: { dim: 3, kind: "ode", dt: 0.01, start: [0.1, 0, 0], defaults: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
      d: function (s, p) { var x = s[0], y = s[1], z = s[2];
        return [(z - p.b) * x - p.d * y, p.d * x + (z - p.b) * y, p.c + p.a * z - z * z * z / 3 - (x * x + y * y) * (1 + p.e * z) + p.f * z * x * x * x]; } },
    thomas: { dim: 3, kind: "ode", dt: 0.05, start: [1.1, 1.1, -0.5], defaults: { b: 0.208 },
      d: function (s, p) { return [Math.sin(s[1]) - p.b * s[0], Math.sin(s[2]) - p.b * s[1], Math.sin(s[0]) - p.b * s[2]]; } },
    // discrete maps (iterated)
    dejong: { dim: 2, kind: "map", start: [0.1, 0.1], defaults: { a: 1.4, b: -2.3, c: 2.4, d: -2.1 },
      m: function (s, p) { return [Math.sin(p.a * s[1]) - Math.cos(p.b * s[0]), Math.sin(p.c * s[0]) - Math.cos(p.d * s[1])]; } },
    clifford: { dim: 2, kind: "map", start: [0.1, 0.1], defaults: { a: -1.4, b: 1.6, c: 1.0, d: 0.7 },
      m: function (s, p) { return [Math.sin(p.a * s[1]) + p.c * Math.cos(p.a * s[0]), Math.sin(p.b * s[0]) + p.d * Math.cos(p.b * s[1])]; } }
  };

  function trace(name, params, opts) {
    var sys = SYS[name] || SYS.lorenz; opts = opts || {};
    var n = opts.n || 1400, warm = opts.warmup != null ? opts.warmup : 300, dt = opts.dt || sys.dt || 0.01;
    var p = {}; for (var k in sys.defaults) p[k] = sys.defaults[k]; if (params) for (var j in params) if (params[j] != null) p[j] = params[j];
    var s = sys.start.slice(); if (s.length < 3) s[2] = 0;
    var pts = [], total = n + warm, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (var i = 0; i < total; i++) {
      if (sys.kind === "ode") { var d = sys.d(s, p); s = [s[0] + d[0] * dt, s[1] + d[1] * dt, s[2] + d[2] * dt]; }
      else { var m = sys.m(s, p); s = [m[0], m[1], 0]; }
      if (!isFinite(s[0]) || !isFinite(s[1]) || !isFinite(s[2])) break;   // guard divergence
      if (i >= warm) { var pt = [s[0], s[1], sys.dim === 3 ? s[2] : 0]; pts.push(pt);
        for (var a = 0; a < 3; a++) { if (pt[a] < mn[a]) mn[a] = pt[a]; if (pt[a] > mx[a]) mx[a] = pt[a]; } }
    }
    if (opts.normalize !== false && pts.length) {
      var c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
      var ext = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2 || 1;
      for (var q = 0; q < pts.length; q++) pts[q] = [(pts[q][0] - c[0]) / ext, (pts[q][1] - c[1]) / ext, (pts[q][2] - c[2]) / ext];
    }
    return { pts: pts, dim: sys.dim };
  }

  return {
    trace: trace,
    SYSTEMS: Object.keys(SYS),
    DEFAULTS: function (name) { var d = (SYS[name] || {}).defaults || {}, o = {}; for (var k in d) o[k] = d[k]; return o; },
    info: function (name) { return SYS[name]; }
  };
});
