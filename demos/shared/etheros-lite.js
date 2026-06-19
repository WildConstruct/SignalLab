/*
 * SIGNAL RACK — etheros-lite  (demos/shared/etheros-lite.js)
 * -------------------------------------------------------------------------
 * A tiny CPU mirror of the Etheros field engine's recipe pipeline, for the web
 * demos: Variation → Structure → Shape → Motion → Warp → scalar Output. It uses
 * the SAME recipe block/field names as core/etheros_recipe.h so it doubles as the
 * convergence reference. NOT the real Dawn engine — it proves the field⟷signal
 * composition shape, not pixel parity.
 *
 *   EtherosLite.sample(recipe, x, y, t) -> 0..1   // x,y in ~[0,1] domain
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EtherosLite = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function h3(i, j, k) { var n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function vnoise(x, y, z) {
    var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    var x00 = lerp(h3(ix, iy, iz), h3(ix + 1, iy, iz), ux), x10 = lerp(h3(ix, iy + 1, iz), h3(ix + 1, iy + 1, iz), ux);
    var x01 = lerp(h3(ix, iy, iz + 1), h3(ix + 1, iy, iz + 1), ux), x11 = lerp(h3(ix, iy + 1, iz + 1), h3(ix + 1, iy + 1, iz + 1), ux);
    return lerp(lerp(x00, x10, uy), lerp(x01, x11, uy), uz);   // 0..1
  }
  function fractal(mode, x, y, z, oct, rough, lac) {
    var sum = 0, amp = 1, fr = 1, norm = 0;
    for (var o = 0; o < oct; o++) {
      var nv = vnoise(x * fr, y * fr, z * fr), s;
      if (mode === "ridged") { s = 1 - Math.abs(nv * 2 - 1); s = s * s; }
      else if (mode === "billow") { s = Math.abs(nv * 2 - 1); }
      else if (mode === "turbulence") { s = Math.abs(nv * 2 - 1); }
      else s = nv;                                              // fbm
      sum += s * amp; norm += amp; amp *= rough; fr *= lac;
    }
    return norm ? sum / norm : 0;
  }
  function shape(v, sh) {
    sh = sh || {};
    v = (v - 0.5) * (sh.contrast != null ? sh.contrast : 1) + 0.5 + (sh.bias || 0);
    var tl = sh.thresholdLow != null ? sh.thresholdLow : 0, th = sh.thresholdHigh != null ? sh.thresholdHigh : 1;
    if (th !== tl) v = (v - tl) / (th - tl);
    if (sh.absolute) v = Math.abs(v * 2 - 1);
    if (sh.gain && sh.gain !== 1) v = Math.pow(Math.max(0, v), 1 / sh.gain);
    v = Math.max(sh.clampLow != null ? sh.clampLow : 0, Math.min(sh.clampHigh != null ? sh.clampHigh : 1, v));
    if (sh.invert) v = 1 - v;
    return v;
  }
  function sample(r, x, y, t) {
    r = r || {}; var V = r.variation || {}, St = r.structure || {}, M = r.motion || {}, Wp = r.warp || {};
    var seed = (V.seed || 0) * 0.137;
    var fx = x + seed, fy = y + seed * 1.7, z = 0;
    var mode = M.mode || "static";
    if (mode === "flow" || mode === "flowAnisotropic") { var d = M.flowDirection || [0, 1]; fx += d[0] * (M.flowStrength || 0) * t; fy += d[1] * (M.flowStrength || 0) * t; }
    if (mode === "evolve" || mode === "flow") z += t * (M.evolutionRate != null ? M.evolutionRate : 0.15);
    if (Wp.enabled !== false && (Wp.amount || 0) > 0) {
      var ws = Wp.scale || 1;
      var wx = vnoise(fx * ws + 3.1, fy * ws, z), wy = vnoise(fx * ws + 9.7, fy * ws + 5.3, z);
      fx += (wx * 2 - 1) * Wp.amount; fy += (wy * 2 - 1) * Wp.amount;
    }
    var bs = St.baseScale != null ? St.baseScale : 3;
    var v = fractal(St.fractalMode || "fbm", fx * bs, fy * bs, z, Math.max(1, Math.round(St.octaveCount || 5)), St.roughness != null ? St.roughness : 0.5, St.lacunarity || 2);
    return shape(v, r.shape);
  }
  return { sample: sample, vnoise: vnoise };
});
