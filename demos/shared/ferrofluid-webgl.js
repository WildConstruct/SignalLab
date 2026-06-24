/*
 * SIGNAL RACK - ferrofluid WebGL adapter (demos/shared/ferrofluid-webgl.js)
 * -------------------------------------------------------------------------
 * Renderer contract shim for the ferrofluid demo. This first slice detects
 * whether WebGL can be touched safely, then intentionally yields the Canvas
 * fallback until the GPU renderer has a real implementation.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FerrofluidWebGL = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function getWebGLContext(canvas) {
    var names = ["webgl2", "webgl", "experimental-webgl"];

    if (!canvas || typeof canvas.getContext !== "function") return null;

    for (var i = 0; i < names.length; i++) {
      try {
        var gl = canvas.getContext(names[i]);
        if (gl) return gl;
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  function createRenderer(canvas) {
    return Promise.resolve().then(function () {
      var gl = getWebGLContext(canvas);
      if (!gl) return null;
      return null;
    });
  }

  return {
    createRenderer: createRenderer
  };
});
