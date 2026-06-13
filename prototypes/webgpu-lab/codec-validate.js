/* Round-trip test of the live-courier value codec. `node codec-validate.js`
 * Simulates the full plugin->pixel->sampleImage->expression path, including
 * 8-bit-per-channel quantization (what an AE pixel actually stores). */
var C = require("./value-codec.js");
var pass = 0, fail = 0;
function ok(n, c) { (c ? pass++ : fail++); console.log((c ? "  ok  " : " FAIL ") + n); }

// AE stores 8 bits/channel; emulate that the pixel only holds quantized bytes,
// then sampleImage hands those bytes back as floats. pack24 already quantizes,
// so the round trip should be near-exact for 24-bit packing.
function roundTrip24(v) { return C.unpack24(C.pack24(v)); }
function roundTrip8(v) { return C.unpack8(C.pack8(v)); }

// 24-bit precision: error should be < 1 LSB of 24-bit (~6e-8) — but each channel
// is only 8-bit, so reconstructed value is exact to the packed integer.
var maxErr24 = 0;
for (var i = 0; i <= 1000; i++) {
  var v = i / 1000;
  maxErr24 = Math.max(maxErr24, Math.abs(roundTrip24(v) - v));
}
ok("24-bit pack round-trips within 1/16.7M (err=" + maxErr24.toExponential(2) + ")", maxErr24 < 1 / C.MAX24 + 1e-9);

// 8-bit fallback: coarse (~1/255) but bounded and monotonic.
var maxErr8 = 0;
for (var j = 0; j <= 1000; j++) { var v8 = j / 1000; maxErr8 = Math.max(maxErr8, Math.abs(roundTrip8(v8) - v8)); }
ok("8-bit fallback bounded by ~1/255 (err=" + maxErr8.toExponential(2) + ")", maxErr8 <= 1 / 255 / 2 + 1e-9);

// Endpoints exact.
ok("0 -> 0", roundTrip24(0) === 0);
ok("1 -> 1", roundTrip24(1) === 1);

// A realistic control value (e.g. normalized 0.6180339) survives 24-bit.
ok("golden value precise to 1e-6", Math.abs(roundTrip24(0.6180339) - 0.6180339) < 1e-6);

// Strip packs 3 channels independently.
var strip = C.packStrip(0.1, 0.5, 0.9);
ok("strip column A decodes ~0.1", Math.abs(C.unpack24(strip[0]) - 0.1) < 1e-6);
ok("strip column C decodes ~0.9", Math.abs(C.unpack24(strip[2]) - 0.9) < 1e-6);

// COLOR-MANAGEMENT HAZARD: if a gamma 2.2 transform touches the strip before
// sampleImage reads it, 24-bit packing corrupts badly while 8-bit survives if
// we re-linearize. This test documents WHY the strip must be linear/unmanaged.
function gamma(rgb, g) { return rgb.map(function (c) { return Math.pow(c, g); }); }
var v = 0.42, packed = C.pack24(v);
var corrupted = C.unpack24(gamma(packed, 1 / 2.2)); // sampleImage saw gamma-encoded bytes
ok("gamma on 24-bit pack DOES corrupt (proves caveat)", Math.abs(corrupted - v) > 0.05);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
