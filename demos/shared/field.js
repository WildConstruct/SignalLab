/*
 * SIGNAL RACK — field engine driver  (demos/shared/field.js)
 * -------------------------------------------------------------------------
 * A reusable ENGINE driver: a 2D vector field sampled at (x,y,t). Deterministic
 * (no per-call randomness) and bounded (unit-ish vectors), so it's parity-
 * friendly. Tools SURFACE the type/scale; consumers advect particles (Particles)
 * or warp coordinates (Glitch) by it.
 *
 *   Field.sample(type, x, y, t, params) -> { vx, vy }   // x,y in ~[-1,1]
 *     type: "curl" (noise flow field) | "vortex" | "radial"
 *     params: { scale }
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Field = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function hash2(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) {                                   // value noise, smooth, 0..1
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  function sample(type, x, y, t, p) {
    p = p || {}; var sc = p.scale != null ? p.scale : 1.4;
    if (type === "vortex") { var m = Math.hypot(x, y) || 1e-3; return { vx: -y / m, vy: x / m }; }
    if (type === "radial") { var m2 = Math.hypot(x, y) || 1e-3; return { vx: x / m2, vy: y / m2 }; }
    var a = vnoise(x * sc + t, y * sc - t * 0.5) * Math.PI * 4;   // curl/flow: angle from noise
    return { vx: Math.cos(a), vy: Math.sin(a) };
  }
  return { sample: sample, vnoise: vnoise, TYPES: ["curl", "vortex", "radial"] };
});
