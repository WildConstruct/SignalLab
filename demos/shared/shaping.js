/*
 * SIGNAL RACK — shared shaping helpers  (demos/shared/shaping.js)
 * -------------------------------------------------------------------------
 * The "subtle" layer that every demo can opt into, so the suite shares one
 * vocabulary for HOW a signal maps onto a structure:
 *
 *   FIELD MAPPING — given element i of count, which point of the signal does it
 *   read? uniform (all the same) / sweep (a wave travels across) / radial
 *   (mirrored from the centre) / stagger (pseudo-random per element).
 *
 *   RESPONSE — remap an input window [lo,hi] → 0..1, then apply a gamma/ease
 *   curve. Plus a small PeakHold for meters-style decay.
 *
 * Helpers return control specs (tier "shaping") demos spread into their panel,
 * and pure functions the renderers call. No signal math beyond index selection
 * and curves — the driver/engine remains the source of truth.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./signal-engine"));
  else root.SignalShaping = factory(root.SignalEngine);
})(typeof self !== "undefined" ? self : this, function (SignalEngine) {
  "use strict";
  var combine = SignalEngine.combine;

  var FIELD_OPTS = [
    { value: "uniform", label: "Uniform" }, { value: "sweep", label: "Sweep" },
    { value: "radial", label: "Radial" }, { value: "stagger", label: "Stagger" }
  ];

  function hash(k) { var s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  // buffer index 0..L-1 for element i of count, per field mode
  function fieldIndex(mode, i, count, L, seed) {
    var f = count > 1 ? i / (count - 1) : 0;
    switch (mode) {
      case "sweep":   return Math.floor(f * (L - 1));
      case "radial":  return Math.floor(Math.abs(f - 0.5) * 2 * (L - 1));
      case "stagger": return Math.floor(hash(i + (seed || 0)) * (L - 1));
      default:        return L - 1;   // uniform → latest sample
    }
  }

  // combined 0..1 signal value an element reads under the current field mode
  function fieldValue(F, i, count, seed) {
    var bx = F.bufX, by = F.bufY, L = bx.length;
    var idx = fieldIndex(F.S.field || "uniform", i, count, L, seed);
    return Math.max(0, Math.min(1, combine(F.S._drive || "x", bx[idx], by[idx])));
  }

  // input window [lo,hi] -> 0..1, then gamma curve
  function response(v, S) {
    var lo = S.rlo != null ? S.rlo : 0, hi = S.rhi != null ? S.rhi : 1;
    var r = hi === lo ? 0 : (v - lo) / (hi - lo);
    r = r < 0 ? 0 : (r > 1 ? 1 : r);
    return Math.pow(r, S.gamma != null ? S.gamma : 1);
  }

  function PeakHold(decay) { this.v = 0; this.decay = decay || 0.006; }
  PeakHold.prototype.push = function (x) { this.v = Math.max(x, this.v - this.decay); return this.v; };

  // ---- spec factories (spread into a demo's `shaping` array) ----
  function fieldSpec(defaultMode) {
    return { tier: "shaping", key: "field", label: "Field map", type: "select",
             value: defaultMode || "uniform", options: FIELD_OPTS };
  }
  function responseSpecs(defaults) {
    defaults = defaults || {};
    return [
      { tier: "shaping", key: "gamma", label: "Response <span>γ</span>", type: "slider", min: 0.3, max: 3, step: 0.05, value: defaults.gamma != null ? defaults.gamma : 1, fmt: function (v) { return (+v).toFixed(2); } },
      { tier: "shaping", key: "rlo",   label: "Remap min", type: "slider", min: 0, max: 1, step: 0.01, value: defaults.rlo != null ? defaults.rlo : 0, fmt: function (v) { return (+v).toFixed(2); } },
      { tier: "shaping", key: "rhi",   label: "Remap max", type: "slider", min: 0, max: 1, step: 0.01, value: defaults.rhi != null ? defaults.rhi : 1, fmt: function (v) { return (+v).toFixed(2); } }
    ];
  }

  return { fieldIndex: fieldIndex, fieldValue: fieldValue, response: response,
           PeakHold: PeakHold, fieldSpec: fieldSpec, responseSpecs: responseSpecs,
           FIELD_OPTS: FIELD_OPTS };
});
