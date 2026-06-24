/*
 * SIGNAL RACK - ferrofluid WebGL adapter (demos/shared/ferrofluid-webgl.js)
 * -------------------------------------------------------------------------
 * Renderer contract shim for the ferrofluid demo. This first slice does not
 * touch the canvas, so SignalHost can safely claim it for the Canvas fallback.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FerrofluidWebGL = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function createRenderer(canvas) {
    return Promise.resolve(null);
  }

  return {
    createRenderer: createRenderer
  };
});
