/*
 * SIGNAL RACK - ferrofluid resonance model (demos/shared/ferrofluid-model.js)
 * -------------------------------------------------------------------------
 * Pure model helpers for the ferrofluid demo. Inputs are the shared demo frame
 * packet: live signal n, channel buffers, time, and normalized controls.
 * Outputs are deterministic and renderer-neutral.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FerrofluidModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function clamp(v, lo, hi) {
    v = Number(v);
    if (!isFinite(v)) return lo;
    return Math.max(lo, Math.min(hi, v));
  }

  function clamp01(v, fallback) {
    if (v == null || !isFinite(Number(v))) return fallback;
    return clamp(v, 0, 1);
  }

  function finiteNumber(v, fallback) {
    v = Number(v);
    return isFinite(v) ? v : fallback;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function fract(v) {
    return v - Math.floor(v);
  }

  function hash1(v) {
    return fract(Math.sin(v * 127.1 + 311.7) * 43758.5453123);
  }

  function hash2(x, y) {
    return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
  }

  function smoothstep(edge0, edge1, x) {
    var t = clamp((x - edge0) / ((edge1 - edge0) || 1), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function sampleArray(buf, at, fallback) {
    if (!buf || !buf.length) return fallback;
    var len = buf.length;
    var pos = fract(at) * len;
    var i0 = Math.floor(pos) % len;
    var i1 = (i0 + 1) % len;
    var f = pos - Math.floor(pos);
    return lerp(clamp01(buf[i0], fallback), clamp01(buf[i1], fallback), f);
  }

  function bufferEnergy(buf) {
    if (!buf || !buf.length) return 0.5;
    var acc = 0;
    for (var i = 0; i < buf.length; i++) {
      var v = clamp01(buf[i], 0.5) - 0.5;
      acc += v * v;
    }
    return clamp(Math.sqrt(acc / buf.length) * 2, 0, 1);
  }

  function normalizeControls(S) {
    S = S || {};
    return {
      stage: typeof S.stage === "string" ? S.stage : "aperture",
      blobSize: clamp01(S.blobSize, 0.74),
      surfaceTension: clamp01(S.surfaceTension, 0.68),
      droplets: clamp01(S.droplets, 0),
      seed: Math.floor(clamp(S.seed == null ? 1 : S.seed, 0, 1000000)),
      fieldStrength: clamp01(S.fieldStrength, 0.65),
      resonance: clamp01(S.resonance, 0.5),
      viscosity: clamp01(S.viscosity, 0.58),
      lobeCount: Math.round(clamp(S.lobeCount == null ? 6 : S.lobeCount, 3, 12)),
      reflection: clamp01(S.reflection, 0.7),
      accent: typeof S.accent === "string" ? S.accent : "none",
      spikeThreshold: clamp01(S.spikeThreshold, 0.76)
    };
  }

  function frameControls(frame) {
    frame = frame || {};
    return normalizeControls(frame.S || frame.controls || {});
  }

  function buildField(frame) {
    frame = frame || {};
    var S = frameControls(frame);
    var t = finiteNumber(frame.t, 0);
    var n = clamp01(frame.n, 0);
    var x = clamp01(frame.x, n);
    var y = clamp01(frame.y, n);
    var energyX = bufferEnergy(frame.bufX);
    var energyY = bufferEnergy(frame.bufY);
    var history = clamp((energyX + energyY) * 0.5, 0, 1);
    var phaseBias = (sampleArray(frame.bufX, 0.23 + n * 0.37, x) - sampleArray(frame.bufY, 0.61 + n * 0.19, y)) * 2;
    var pull = 0.14 + S.fieldStrength * (0.34 + n * 0.72) + S.resonance * history * 0.22;
    var thresholdPressure = Math.max(0, n - S.spikeThreshold);
    var spike = clamp(thresholdPressure * (1.3 + S.fieldStrength) + n * S.resonance * 0.34 + history * 0.11, 0, 1.4);
    var energy = clamp(0.12 + S.fieldStrength * 0.42 + S.resonance * history * 0.24 + n * 0.18, 0, 1);
    var lobes = [];

    for (var i = 0; i < S.lobeCount; i++) {
      var u = i / S.lobeCount;
      var seed = S.seed + i * 19.19;
      var hx = sampleArray(frame.bufX, u + t * 0.013 + hash1(seed) * 0.1, x);
      var hy = sampleArray(frame.bufY, 1 - u + t * 0.017 + hash1(seed + 7) * 0.1, y);
      var drive = clamp((hx + hy + n) / 3, 0, 1);
      var wobble = (hash2(seed, S.seed) - 0.5) * 0.55 + phaseBias * 0.08;
      var angle = u * Math.PI * 2 + wobble + t * (0.06 + S.resonance * 0.08);
      var radius = clamp(0.42 + S.blobSize * 0.22 + drive * S.fieldStrength * 0.13 - S.surfaceTension * 0.04, 0.2, 0.86);
      var amp = clamp(0.16 + drive * 0.42 + S.resonance * 0.2 + spike * 0.16, 0, 1);
      lobes.push({
        angle: angle,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        radius: radius,
        amp: amp,
        pressure: clamp(amp * pull + spike * 0.28, 0, 1.5)
      });
    }

    return {
      controls: S,
      signal: n,
      history: history,
      energy: energy,
      pull: pull,
      spike: spike,
      phaseBias: phaseBias,
      lobes: lobes
    };
  }

  function buildDroplets(frame, field) {
    frame = frame || {};
    field = field || buildField(frame);
    var S = field.controls || frameControls(frame);
    if (S.droplets <= 0) return [];
    var count = Math.max(3, Math.round(S.droplets * 8 + field.spike * 2));
    var droplets = [];
    var t = finiteNumber(frame.t, 0);

    for (var i = 0; i < count; i++) {
      var seed = S.seed * 97.13 + i * 53.31;
      var orbit = hash1(seed + 1);
      var angle = orbit * Math.PI * 2 + t * (0.03 + S.viscosity * 0.02);
      var band = 0.62 + hash1(seed + 2) * 0.34;
      var lobe = field.lobes[i % field.lobes.length];
      var lobePush = lobe ? lobe.amp * 0.08 : 0;
      var radius = band + lobePush + field.pull * 0.04;
      droplets.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        r: 0.012 + hash1(seed + 3) * 0.042 + S.droplets * 0.018,
        phase: hash1(seed + 4)
      });
    }

    return droplets;
  }

  function surfaceHeight(frame, field, sx, sy) {
    frame = frame || {};
    field = field || buildField(frame);
    var S = field.controls || frameControls(frame);
    var radius = Math.sqrt(sx * sx + sy * sy);
    var baseRadius = 0.34 + S.blobSize * 0.48;
    var rim = 1 - smoothstep(baseRadius, baseRadius + 0.22, radius);
    var lobeLift = 0;

    for (var i = 0; i < field.lobes.length; i++) {
      var l = field.lobes[i];
      var dx = sx - l.x;
      var dy = sy - l.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var reach = 0.22 + l.amp * 0.18 + S.surfaceTension * 0.08;
      lobeLift += (1 - smoothstep(0, reach, d)) * l.amp;
    }

    var center = Math.max(0, 1 - radius / (baseRadius + 0.18));
    var lift = rim * (0.16 + field.energy * 0.32) + center * field.pull * 0.12 + lobeLift * 0.18 + field.spike * rim * 0.2;
    return {
      mask: clamp(rim + lobeLift * 0.25, 0, 1),
      height: Math.max(0, lift),
      pressure: clamp(field.pull * rim + lobeLift * 0.34 + field.spike * 0.28, 0, 1.6)
    };
  }

  function sampleSurface(frame, field, sx, sy) {
    if (!field) field = buildField(frame);
    sx = Number(sx) || 0;
    sy = Number(sy) || 0;
    var sample = surfaceHeight(frame, field, sx, sy);
    var eps = 0.01;
    var hx0 = surfaceHeight(frame, field, sx - eps, sy).height;
    var hx1 = surfaceHeight(frame, field, sx + eps, sy).height;
    var hy0 = surfaceHeight(frame, field, sx, sy - eps).height;
    var hy1 = surfaceHeight(frame, field, sx, sy + eps).height;
    var dx = (hx1 - hx0) / (eps * 2);
    var dy = (hy1 - hy0) / (eps * 2);
    var nz = 1;
    var inv = 1 / (Math.sqrt(dx * dx + dy * dy + nz * nz) || 1);

    return {
      mask: sample.mask,
      height: sample.height,
      pressure: sample.pressure,
      normal: [-dx * inv, -dy * inv, nz * inv]
    };
  }

  return {
    normalizeControls: normalizeControls,
    buildField: buildField,
    buildDroplets: buildDroplets,
    sampleSurface: sampleSurface,
    _private: {
      clamp: clamp,
      clamp01: clamp01,
      finiteNumber: finiteNumber,
      lerp: lerp,
      hash1: hash1,
      hash2: hash2,
      smoothstep: smoothstep,
      sampleArray: sampleArray,
      bufferEnergy: bufferEnergy,
      surfaceHeight: surfaceHeight
    }
  };
});
