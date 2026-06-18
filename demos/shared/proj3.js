/*
 * SIGNAL RACK — proj3 engine util  (demos/shared/proj3.js)
 * -------------------------------------------------------------------------
 * Pure, deterministic 3D→2D projection so every "3D version of a tool" shares
 * one camera. ENGINE, not design: tools surface yaw/pitch/dist; renderers call
 * project() and scale the result to the canvas. No drawing here.
 *
 *   Proj3.project({x,y,z}, {yaw,pitch,dist}) -> {x, y, z, scale}
 *     - input coords are model space (use normalized ~[-1,1]); output x,y are
 *       projected (still model-scaled — caller multiplies by a screen radius
 *       and offsets to centre). `scale` is the perspective factor (use for
 *       depth-based size/alpha); `z` is camera-space depth (use for sorting).
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Proj3 = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function project(p, cam) {
    cam = cam || {};
    var yaw = cam.yaw || 0, pitch = cam.pitch || 0, dist = cam.dist != null ? cam.dist : 3.2;
    var x = p.x || 0, y = p.y || 0, z = p.z || 0;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y;        // rotate about Y (yaw)
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp;             // rotate about X (pitch)
    var s = dist / (dist + z2);                                     // perspective
    return { x: x1 * s, y: y2 * s, z: z2, scale: s };
  }
  return { project: project };
});
