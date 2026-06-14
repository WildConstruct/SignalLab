/*
 * SIGNAL RACK — signal core CPU REFERENCE (browser + node)
 * -------------------------------------------------------------------------
 * A faithful CPU port of the canonical WGSL engine (shaders/signal_core.wgsl)
 * so the signal logic can be RUN and validated WITHOUT a GPU. The WGSL is the
 * product source of truth; this mirror is the parity/regression oracle used by
 * validate.js.
 *
 * The engine owns the WHOLE per-sample pipeline so hosts (the web tool, the AE
 * plugin) only configure and call it — they never do signal math themselves:
 *
 *     source -> smooth -> process (gain/bias/invert/rectify/quantize/gate)
 *            -> lag -> output profile
 *
 * Sidechain (signal-drives-signal) and luma probing enter as PER-SAMPLE input
 * arrays (modInput / lumaInput), mirroring the WGSL storage buffers — so the
 * engine, not the host, applies modulation and luma mapping.
 *
 * NOTE ON NOISE: the value-noise here matches the WGSL value-noise exactly.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SignalCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function hash(n) { var s = Math.sin(n) * 43758.5453123; return s - Math.floor(s); }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function valueNoise(x) { var i = Math.floor(x), f = x - i, a = hash(i), b = hash(i + 1); return (a + (b - a) * smoothstep(f)) * 2 - 1; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function linear(t, t0, t1, v0, v1) { if (t <= t0) return v0; if (t >= t1) return v1; return v0 + (v1 - v0) * (t - t0) / (t1 - t0); }

  var SOURCE = { sine:1, pulse:2, ramp:3, noise:4, randomWalk:5, linked:6, lumaProbe:7, triangle:8, pulseNarrow:9 };
  var MODE   = { normalized:1, signed:2, percentage:3, degrees:4, pixels:5, custom:6, gate:7, trigger:8 };
  var MOD    = { off:0, amp:1, rate:2, phase:3 };

  function normProcess(p) {
    p = p || {};
    return { gain: p.gain != null ? p.gain : 1, bias: p.bias || 0, quantize: p.quantize || 0,
             gate: p.gate || 0, lag: p.lag || 0, invert: !!p.invert, rectify: !!p.rectify,
             warp: p.warp || 0, fold: p.fold || 0, sat: p.sat || 0 };
  }
  function modCode(m) { if (!m || !m.target || m.target === "off") return 0; return MOD[m.target] || (typeof m.target === "number" ? m.target : 0); }

  function Rack(cfg) {
    cfg = cfg || {};
    this.id       = cfg.id || ("rack_" + Math.floor(Math.random() * 1e5));
    this.srcType  = cfg.srcType || SOURCE.sine;
    this.rate     = cfg.rate != null ? cfg.rate : 1;
    this.amount   = cfg.amount != null ? cfg.amount : 1;
    this.phase    = cfg.phase || 0;
    this.seed     = cfg.seed != null ? cfg.seed : 1;
    this.offset   = cfg.offset || 0;
    this.smooth   = cfg.smooth || 0;
    this.frameDur = cfg.frameDur || (1 / 30);
    this.inputA   = null;
    this.luma     = cfg.luma || null;          // (t)=>0..1 callback (legacy / single-sample)
    this.process  = normProcess(cfg.process);  // shaping stage
    this.modTarget= modCode(cfg.mod);          // 0 off, 1 amp, 2 rate, 3 phase
    this.modDepth = (cfg.mod && cfg.mod.depth != null) ? cfg.mod.depth : 0;
    this.modInput = cfg.modInput || null;      // per-sample modulator 0..1 (sidechain)
    this.lumaInput= cfg.lumaInput || null;     // per-sample luma 0..1 (probe)
    var d = cfg.outputs || {};
    this.outputs = { A: d.A || { mode: MODE.normalized, min: 0, max: 1 },
                     B: d.B || { mode: MODE.degrees, min: -15, max: 15 },
                     C: d.C || { mode: MODE.gate, min: 0, max: 1 } };
  }
  Rack.prototype.connectInputA = function (rack, ch) { this.inputA = { rack: rack, ch: ch }; return this; };

  // pure unipolar source 0..1 at time tt for sample idx (idx feeds mod/luma arrays)
  Rack.prototype.srcUni = function (tt, idx) {
    idx = idx || 0;
    if (this.srcType === SOURCE.linked) { var v = this.inputA ? this.inputA.rack.output(this.inputA.ch, tt) : 0; return clamp(v, 0, 1); }
    if (this.srcType === SOURCE.lumaProbe) {
      var l = this.lumaInput ? this.lumaInput[idx] : (this.luma ? this.luma(tt) : 0);
      return clamp(l + this.offset, 0, 1);
    }
    var rate = this.rate, amount = this.amount, phase = this.phase;
    if (this.modTarget && this.modInput) {                 // sidechain modulation
      var m = this.modInput[idx];
      if (this.modTarget === MOD.amp)   amount *= (1 - this.modDepth + this.modDepth * m);
      if (this.modTarget === MOD.rate)  rate   *= (1 + this.modDepth * (m * 2 - 1));
      if (this.modTarget === MOD.phase) phase  += this.modDepth * m;
    }
    var seedPhase = (this.seed * 0.07) - Math.floor(this.seed * 0.07);   // Seed shifts the waveform
    var x = tt * rate + phase + seedPhase, fx = x - Math.floor(x), bp;
    switch (this.srcType) {
      case SOURCE.sine:       bp = Math.sin(x * Math.PI * 2); break;                                  // 1
      case SOURCE.pulse:      bp = fx < 0.5 ? 1 : -1; break;                                          // 2 Square
      case SOURCE.ramp:       bp = fx * 2 - 1; break;                                                 // 3 Saw
      case SOURCE.noise:      bp = valueNoise(x + this.seed * 0.123); break;                          // 4
      case SOURCE.randomWalk: { var sum = 0, amp = 1, fr = 1, norm = 0; for (var o = 0; o < 4; o++) { sum += amp * valueNoise(x * fr + this.seed + o * 7.7); norm += amp; amp *= 0.5; fr *= 2; } bp = sum / norm; break; } // 5
      case 8:                 bp = 4 * Math.abs(fx - 0.5) - 1; break;                                 // 8 Triangle
      case 9:                 bp = fx < 0.2 ? 1 : -1; break;                                          // 9 Pulse (narrow)
      default: bp = 0;
    }
    bp *= amount;
    return (bp + 1) / 2 + this.offset;
  };

  Rack.prototype.smoothed = function (tt, idx) {
    if (this.smooth <= 0) return this.srcUni(tt, idx);
    var win = this.smooth * 0.5, N = Math.round(clamp(this.smooth * 24, 1, 24)), acc = 0;
    for (var i = 0; i < N; i++) { var f = N === 1 ? 0 : i / (N - 1); acc += this.srcUni(tt - win * f, idx); }
    return acc / N;
  };

  // pointwise processor on a normalized value
  function tanhA(x) { var c = clamp(x, -4, 4), a = c * c; return c * (27 + a) / (27 + 9 * a); }
  Rack.prototype.pointwise = function (n) {
    var p = this.process;
    if (p.gain !== 1 || p.bias) n = clamp01(0.5 + (n - 0.5) * p.gain + p.bias);
    if (p.sat > 0) { var bp = n * 2 - 1, g = 1 + p.sat * 8, bias = p.sat * 0.25; var sh = tanhA(bp * g + bias) - tanhA(bias); n = ((bp * (1 - p.sat) + sh * p.sat) + 1) * 0.5; }
    if (p.warp) { var bp = n * 2 - 1, pw = Math.pow(3, -p.warp); n = ((bp < 0 ? -1 : 1) * Math.pow(Math.abs(bp), pw) + 1) * 0.5; }
    if (p.fold > 0) { var x = (n * 2 - 1) * (1 + p.fold * 6); var xm = (x - 1) - 4 * Math.floor((x - 1) / 4); n = Math.abs(xm - 2) * 0.5; }
    if (p.invert) n = 1 - n;
    if (p.rectify) n = Math.abs(n * 2 - 1);
    if (p.quantize > 1) n = Math.round(n * (p.quantize - 1)) / (p.quantize - 1);
    if (p.gate > 0) n = n >= p.gate ? 1 : 0;
    return n;
  };
  Rack.prototype.shapedN = function (tt, idx) { return this.pointwise(clamp01(this.smoothed(tt, idx))); };

  // normalized value after lag (finite geometric EWMA — parallel-safe / matches WGSL)
  Rack.prototype.normN = function (tt, idx) {
    var lag = this.process.lag;
    if (lag <= 0) return this.shapedN(tt, idx);
    idx = idx || 0;
    var K = Math.min(34, Math.round(lag * 32) + 2), acc = 0, wsum = 0, w = 1;
    for (var k = 0; k < K; k++) { var j = idx - k; if (j < 0) j = 0; acc += w * this.shapedN(tt - k * this.frameDur, j); wsum += w; w *= lag; }
    return acc / wsum;
  };

  Rack.prototype.output = function (ch, tt, idx) {
    var o = this.outputs[ch], n = clamp01(this.normN(tt, idx));
    if (o.mode === MODE.gate) return n >= 0.5 ? o.max : o.min;
    if (o.mode === MODE.trigger) {
      for (var k = 1; k <= 3; k++) { var a = this.srcUni(tt - k * this.frameDur, idx) >= 0.5, b = this.srcUni(tt - (k - 1) * this.frameDur, idx) >= 0.5; if (b && !a) return o.max; }
      return o.min;
    }
    return linear(n, 0, 1, o.min, o.max);
  };
  Rack.prototype.normalized = function (ch, tt, idx) { var o = this.outputs[ch], v = this.output(ch, tt, idx); return o.max === o.min ? 0 : clamp((v - o.min) / (o.max - o.min), 0, 1); };

  return { Rack: Rack, SOURCE: SOURCE, MODE: MODE, MOD: MOD, _util: { valueNoise: valueNoise, clamp: clamp, clamp01: clamp01, linear: linear } };
});
