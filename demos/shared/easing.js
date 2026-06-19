/*
 * SIGNAL RACK — easing / timing engine driver  (demos/shared/easing.js)
 * -------------------------------------------------------------------------
 * Reusable ENGINE driver: a library of pure, deterministic timing curves that
 * remap a 0..1 playhead. Tools SURFACE the curve choice; consumers shape a
 * playhead (Transitions) or per-letter reveal timing (Kinetic Type). The signal
 * can BE the playhead — let the driver drive time, not just the clock.
 *
 *   Easing.apply(name, p) -> shaped 0..1     // p clamped to [0,1]
 *   Easing.NAMES, Easing.OPTIONS (for a select)
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Easing = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var c1 = 1.70158, c3 = c1 + 1, c4 = (2 * Math.PI) / 3;
  var E = {
    linear: function (p) { return p; },
    smooth: function (p) { return p * p * (3 - 2 * p); },
    in: function (p) { return p * p; },
    out: function (p) { return 1 - (1 - p) * (1 - p); },
    inout: function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; },
    expoIn: function (p) { return p <= 0 ? 0 : Math.pow(2, 10 * p - 10); },
    expoOut: function (p) { return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); },
    back: function (p) { return c3 * p * p * p - c1 * p * p; },
    elastic: function (p) { return p === 0 || p === 1 ? p : -Math.pow(2, 10 * p - 10) * Math.sin((p * 10 - 10.75) * c4); },
    bounce: function (p) { var n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) { p -= 1.5 / d; return n * p * p + 0.75; } if (p < 2.5 / d) { p -= 2.25 / d; return n * p * p + 0.9375; } p -= 2.625 / d; return n * p * p + 0.984375; }
  };
  var LABEL = { linear: "Linear", smooth: "Smooth", in: "Ease in", out: "Ease out", inout: "Ease in-out", expoIn: "Expo in", expoOut: "Expo out", back: "Back", elastic: "Elastic", bounce: "Bounce" };
  function apply(name, p) { p = p < 0 ? 0 : (p > 1 ? 1 : p); return (E[name] || E.linear)(p); }
  return { apply: apply, fns: E, NAMES: Object.keys(E), OPTIONS: Object.keys(E).map(function (k) { return { value: k, label: LABEL[k] || k }; }) };
});
