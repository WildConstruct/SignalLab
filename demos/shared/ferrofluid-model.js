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

  function gridIndex(w, x, y) {
    return x + y * w;
  }

  function setGridBoundary(dst, w, h) {
    var x, y;
    for (x = 1; x < w - 1; x++) {
      dst[gridIndex(w, x, 0)] = dst[gridIndex(w, x, 1)];
      dst[gridIndex(w, x, h - 1)] = dst[gridIndex(w, x, h - 2)];
    }
    for (y = 1; y < h - 1; y++) {
      dst[gridIndex(w, 0, y)] = dst[gridIndex(w, 1, y)];
      dst[gridIndex(w, w - 1, y)] = dst[gridIndex(w, w - 2, y)];
    }
    dst[0] = dst[gridIndex(w, 1, 1)];
    dst[w - 1] = dst[gridIndex(w, w - 2, 1)];
    dst[gridIndex(w, 0, h - 1)] = dst[gridIndex(w, 1, h - 2)];
    dst[gridIndex(w, w - 1, h - 1)] = dst[gridIndex(w, w - 2, h - 2)];
  }

  function sampleGrid(src, w, h, x, y) {
    x = clamp(x, 0, w - 1);
    y = clamp(y, 0, h - 1);
    var x0 = Math.floor(x);
    var y0 = Math.floor(y);
    var x1 = Math.min(w - 1, x0 + 1);
    var y1 = Math.min(h - 1, y0 + 1);
    var tx = x - x0;
    var ty = y - y0;
    var a = lerp(src[gridIndex(w, x0, y0)], src[gridIndex(w, x1, y0)], tx);
    var b = lerp(src[gridIndex(w, x0, y1)], src[gridIndex(w, x1, y1)], tx);
    return lerp(a, b, ty);
  }

  function advect(dst, src, vx, vy, w, h, dt, dissipation) {
    var x, y, i, backX, backY;
    var dtX = dt * (w - 2);
    var dtY = dt * (h - 2);
    for (y = 1; y < h - 1; y++) {
      for (x = 1; x < w - 1; x++) {
        i = gridIndex(w, x, y);
        backX = x - vx[i] * dtX;
        backY = y - vy[i] * dtY;
        dst[i] = sampleGrid(src, w, h, backX, backY) * dissipation;
      }
    }
    setGridBoundary(dst, w, h);
  }

  function projectVelocity(vx, vy, pressure, divergence, w, h) {
    var x, y, i, k;
    for (y = 1; y < h - 1; y++) {
      for (x = 1; x < w - 1; x++) {
        i = gridIndex(w, x, y);
        divergence[i] = -0.5 * (
          (vx[gridIndex(w, x + 1, y)] - vx[gridIndex(w, x - 1, y)]) / w +
          (vy[gridIndex(w, x, y + 1)] - vy[gridIndex(w, x, y - 1)]) / h
        );
        pressure[i] = 0;
      }
    }
    setGridBoundary(divergence, w, h);
    setGridBoundary(pressure, w, h);

    for (k = 0; k < 12; k++) {
      for (y = 1; y < h - 1; y++) {
        for (x = 1; x < w - 1; x++) {
          i = gridIndex(w, x, y);
          pressure[i] = (
            divergence[i] +
            pressure[gridIndex(w, x - 1, y)] +
            pressure[gridIndex(w, x + 1, y)] +
            pressure[gridIndex(w, x, y - 1)] +
            pressure[gridIndex(w, x, y + 1)]
          ) * 0.25;
        }
      }
      setGridBoundary(pressure, w, h);
    }

    for (y = 1; y < h - 1; y++) {
      for (x = 1; x < w - 1; x++) {
        i = gridIndex(w, x, y);
        vx[i] -= 0.5 * w * (pressure[gridIndex(w, x + 1, y)] - pressure[gridIndex(w, x - 1, y)]);
        vy[i] -= 0.5 * h * (pressure[gridIndex(w, x, y + 1)] - pressure[gridIndex(w, x, y - 1)]);
      }
    }
    setGridBoundary(vx, w, h);
    setGridBoundary(vy, w, h);
  }

  function seedFluidHeight(height, w, h) {
    var x, y, sx, sy, r, core;
    for (y = 0; y < h; y++) {
      sy = y / (h - 1) * 2 - 1;
      for (x = 0; x < w; x++) {
        sx = x / (w - 1) * 2 - 1;
        r = Math.sqrt(sx * sx + (sy / 0.72) * (sy / 0.72));
        core = 1 - smoothstep(0.34, 0.84, r);
        height[gridIndex(w, x, y)] = core * 0.18;
      }
    }
  }

  function magneticPotential(frame, field, sx, sy, t) {
    var S = field.controls || frameControls(frame);
    var ey = sy / 0.72;
    var r = Math.sqrt(sx * sx + ey * ey);
    var angle = Math.atan2(ey, sx);
    var blobRadius = 0.36 + S.blobSize * 0.42;
    var rim = 1 - smoothstep(blobRadius, blobRadius + 0.2 - S.surfaceTension * 0.08, r);
    var u = (angle / (Math.PI * 2)) + 0.5;
    var sigX = sampleArray(frame.bufX, u + r * 0.31 + t * 0.019, field.signal);
    var sigY = sampleArray(frame.bufY, 1 - u + r * 0.23 + t * 0.023, field.signal);
    var signal = clamp((sigX + sigY + field.signal) / 3, 0, 1);
    var radial = 0.5 + 0.5 * Math.cos(r * (15 + S.lobeCount * 1.7) - t * (2.2 + S.resonance * 4.4) + field.phaseBias * 2.2);
    var angular = 0.5 + 0.5 * Math.cos(angle * S.lobeCount + t * (1.1 + S.resonance * 2.9) + field.phaseBias * 2.8);
    var resonance = Math.pow(clamp(radial * 0.62 + angular * 0.38, 0, 1), 2.35);
    var core = Math.exp(-r * r * (3.6 - S.blobSize * 1.4));
    var threshold = smoothstep(S.spikeThreshold * 0.72, 1, signal);
    var lift = rim * (0.1 + field.pull * 0.18 + core * 0.24);
    lift += rim * resonance * (0.14 + field.spike * 0.62 + S.resonance * 0.28 + threshold * 0.22);
    return lift;
  }

  function injectMagneticField(state, frame, field, dt) {
    var S = field.controls || frameControls(frame);
    var w = state.width;
    var h = state.height;
    var t = finiteNumber(frame && frame.t, 0);
    var potential = state.potential;
    var x, y, i, sx, sy, p, gx, gy, swirl, gain, relax;
    for (y = 0; y < h; y++) {
      sy = y / (h - 1) * 2 - 1;
      for (x = 0; x < w; x++) {
        sx = x / (w - 1) * 2 - 1;
        potential[gridIndex(w, x, y)] = magneticPotential(frame, field, sx, sy, t);
      }
    }
    setGridBoundary(potential, w, h);

    gain = dt * (4.5 + S.fieldStrength * 7.5 + S.resonance * 6);
    relax = clamp(dt * (1.1 + S.resonance * 3.6 + S.fieldStrength * 2.2), 0, 0.34);
    for (y = 1; y < h - 1; y++) {
      sy = y / (h - 1) * 2 - 1;
      for (x = 1; x < w - 1; x++) {
        sx = x / (w - 1) * 2 - 1;
        i = gridIndex(w, x, y);
        p = potential[i];
        gx = potential[gridIndex(w, x + 1, y)] - potential[gridIndex(w, x - 1, y)];
        gy = potential[gridIndex(w, x, y + 1)] - potential[gridIndex(w, x, y - 1)];
        swirl = (sampleArray(frame.bufX, (x / w) + t * 0.031, field.signal) -
          sampleArray(frame.bufY, (y / h) + t * 0.037, field.signal)) * S.resonance;
        state.vx[i] += gx * gain - sy * swirl * dt * 0.55;
        state.vy[i] += gy * gain + sx * swirl * dt * 0.55;
        state.heightField[i] = clamp(lerp(state.heightField[i], p, relax) + p * field.spike * dt * 0.15, 0, 1.6);
      }
    }
    setGridBoundary(state.vx, w, h);
    setGridBoundary(state.vy, w, h);
    setGridBoundary(state.heightField, w, h);
  }

  function diffuseHeight(state, amount) {
    var w = state.width;
    var h = state.height;
    var src = state.heightField;
    var dst = state.scratch;
    var x, y, i, avg;
    for (y = 1; y < h - 1; y++) {
      for (x = 1; x < w - 1; x++) {
        i = gridIndex(w, x, y);
        avg = (
          src[gridIndex(w, x - 1, y)] +
          src[gridIndex(w, x + 1, y)] +
          src[gridIndex(w, x, y - 1)] +
          src[gridIndex(w, x, y + 1)]
        ) * 0.25;
        dst[i] = lerp(src[i], avg, amount);
      }
    }
    setGridBoundary(dst, w, h);
    state.heightField.set(dst);
  }

  function fluidStats(snapshot) {
    var h = snapshot.heightField;
    var vx = snapshot.velocityX;
    var vy = snapshot.velocityY;
    var w = snapshot.width;
    var height = snapshot.height;
    var mass = 0;
    var maxHeight = 0;
    var velocityEnergy = 0;
    var curlEnergy = 0;
    var i, x, y, c;
    for (i = 0; i < h.length; i++) {
      mass += h[i];
      maxHeight = Math.max(maxHeight, h[i]);
      velocityEnergy += vx[i] * vx[i] + vy[i] * vy[i];
    }
    for (y = 1; y < height - 1; y++) {
      for (x = 1; x < w - 1; x++) {
        c = (vy[gridIndex(w, x + 1, y)] - vy[gridIndex(w, x - 1, y)]) -
          (vx[gridIndex(w, x, y + 1)] - vx[gridIndex(w, x, y - 1)]);
        curlEnergy += Math.abs(c);
      }
    }
    return {
      mass: mass / h.length,
      maxHeight: maxHeight,
      velocityEnergy: Math.sqrt(velocityEnergy / h.length),
      curlEnergy: curlEnergy / Math.max(1, (w - 2) * (height - 2))
    };
  }

  function createFluidSolver(width, height) {
    width = Math.round(clamp(width, 12, 256));
    height = Math.round(clamp(height, 12, 256));
    var size = width * height;
    var state = {
      width: width,
      height: height,
      heightField: new Float32Array(size),
      heightPrev: new Float32Array(size),
      vx: new Float32Array(size),
      vy: new Float32Array(size),
      vxPrev: new Float32Array(size),
      vyPrev: new Float32Array(size),
      pressure: new Float32Array(size),
      divergence: new Float32Array(size),
      potential: new Float32Array(size),
      scratch: new Float32Array(size),
      lastTime: null
    };

    function reset() {
      state.heightField.fill(0);
      state.heightPrev.fill(0);
      state.vx.fill(0);
      state.vy.fill(0);
      state.vxPrev.fill(0);
      state.vyPrev.fill(0);
      state.pressure.fill(0);
      state.divergence.fill(0);
      state.potential.fill(0);
      state.scratch.fill(0);
      seedFluidHeight(state.heightField, width, height);
      state.lastTime = null;
    }

    function snapshot(frame, field) {
      var out = {
        width: width,
        height: height,
        heightField: state.heightField,
        velocityX: state.vx,
        velocityY: state.vy,
        field: field || buildField(frame),
        controls: (field && field.controls) || frameControls(frame)
      };
      out.stats = fluidStats(out);
      return out;
    }

    function step(frame) {
      frame = frame || {};
      var field = buildField(frame);
      var S = field.controls;
      var t = finiteNumber(frame.t, 0);
      var dt = state.lastTime == null ? 1 / 60 : clamp(t - state.lastTime, 1 / 120, 1 / 24);
      state.lastTime = t;

      injectMagneticField(state, frame, field, dt);
      projectVelocity(state.vx, state.vy, state.pressure, state.divergence, width, height);

      state.vxPrev.set(state.vx);
      state.vyPrev.set(state.vy);
      var velDissipation = 0.992 - S.viscosity * 0.09;
      advect(state.vx, state.vxPrev, state.vxPrev, state.vyPrev, width, height, dt, velDissipation);
      advect(state.vy, state.vyPrev, state.vxPrev, state.vyPrev, width, height, dt, velDissipation);
      projectVelocity(state.vx, state.vy, state.pressure, state.divergence, width, height);

      state.heightPrev.set(state.heightField);
      advect(state.heightField, state.heightPrev, state.vx, state.vy, width, height, dt, 0.992 - S.surfaceTension * 0.04);
      diffuseHeight(state, 0.025 + S.surfaceTension * 0.05);
      injectMagneticField(state, frame, field, dt * 0.55);

      return snapshot(frame, field);
    }

    reset();
    return {
      width: width,
      height: height,
      reset: reset,
      step: step,
      snapshot: snapshot
    };
  }

  function sampleFluidSurface(snapshot, sx, sy) {
    snapshot = snapshot || {};
    var w = snapshot.width || 1;
    var h = snapshot.height || 1;
    var field = snapshot.heightField || [0];
    sx = Number(sx) || 0;
    sy = Number(sy) || 0;
    var gx = (sx * 0.5 + 0.5) * (w - 1);
    var gy = (sy * 0.5 + 0.5) * (h - 1);
    var height = sampleGrid(field, w, h, gx, gy);
    var dx = sampleGrid(field, w, h, gx + 1, gy) - sampleGrid(field, w, h, gx - 1, gy);
    var dy = sampleGrid(field, w, h, gx, gy + 1) - sampleGrid(field, w, h, gx, gy - 1);
    var nx = -dx * 8;
    var ny = -dy * 8;
    var nz = 1;
    var inv = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
    return {
      height: height,
      mask: smoothstep(0.025, 0.16, height),
      pressure: height,
      normal: [nx * inv, ny * inv, nz * inv]
    };
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
    createFluidSolver: createFluidSolver,
    sampleFluidSurface: sampleFluidSurface,
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
