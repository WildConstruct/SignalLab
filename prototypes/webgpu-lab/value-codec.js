/*
 * SIGNAL RACK — value codec (browser + node)
 * -------------------------------------------------------------------------
 * The LIVE courier path. The Signal Rack plugin renders each interpreted
 * scalar output into a pixel (computed in WGSL/Dawn). A one-line AE expression
 * reads that pixel with sampleImage() and decodes it back to a float — so
 * downstream properties pick-whip a LIVE value while the engine stays in WGSL.
 * The expression only decodes; it never generates the signal.
 *
 * Encoding: a normalized value v in [0,1] is packed across R,G,B as a 24-bit
 * integer (8 bits/channel) for ~1/16.7M precision. The plugin writes these
 * bytes; this module is the shared, testable reference for pack/unpack and the
 * C++ header include/signalrack/value_codec.h mirrors it.
 *
 * COLOR-MANAGEMENT CAVEAT (must verify in AE): sampleImage samples in the
 * layer's working space. If a gamma/working-space transform touches the value
 * strip, the mid/low bytes corrupt. The strip must be a linear, non-color-
 * managed pass-through (32-bpc project, value already in working space). See
 * docs/ae-output-publishing.md. Single-channel 8-bit (channelPackBits=8) is the
 * gamma-tolerant fallback at coarse precision.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ValueCodec = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAX24 = 16777215; // 2^24 - 1

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  // pack normalized [0,1] -> [r,g,b] each in [0,1] (what sampleImage returns)
  function pack24(v) {
    var i = Math.round(clamp01(v) * MAX24);
    var r = (i >> 16) & 0xff, g = (i >> 8) & 0xff, b = i & 0xff;
    return [r / 255, g / 255, b / 255];
  }

  // unpack [r,g,b] in [0,1] -> normalized [0,1]
  function unpack24(rgb) {
    var r = Math.round(rgb[0] * 255), g = Math.round(rgb[1] * 255), b = Math.round(rgb[2] * 255);
    return ((r << 16) | (g << 8) | b) / MAX24;
  }

  // coarse, gamma-tolerant single-channel fallback
  function pack8(v) { var b = Math.round(clamp01(v) * 255) / 255; return [b, b, b]; }
  function unpack8(rgb) { return Math.round(rgb[0] * 255) / 255; }

  // A rack writes 3 outputs -> a 3px-wide value strip; column x = channel.
  // Returns [[r,g,b],...] for columns A,B,C given NORMALIZED outputs.
  function packStrip(nA, nB, nC) { return [pack24(nA), pack24(nB), pack24(nC)]; }

  return { pack24: pack24, unpack24: unpack24, pack8: pack8, unpack8: unpack8, packStrip: packStrip, MAX24: MAX24 };
});
