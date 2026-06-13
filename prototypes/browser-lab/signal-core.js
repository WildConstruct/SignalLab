/*
 * SIGNAL RACK — signal core (browser + node)
 * -------------------------------------------------------------------------
 * A faithful JS port of the AE expression engine (prototypes/ae-expressions/
 * signal-engine.jsx) so the signal logic can be RUN and validated outside
 * After Effects. This is the "modular by composition" engine: a Rack reads
 * its params + optional Input A, evaluates a source, smooths it, and maps it
 * through three output profiles. Racks chain by feeding one rack's output
 * into another rack's inputA.
 *
 * NOTE ON NOISE: AE's noise()/seedRandom() are proprietary. Here we use a
 * deterministic value-noise so behaviour is reproducible and shape-correct.
 * Exact sample values will differ from AE; the WAVEFORM CLASS matches.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SignalCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---- deterministic value noise (Perlin-ish, smooth) --------------------
  function hash(n) { var s = Math.sin(n) * 43758.5453123; return s - Math.floor(s); }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function valueNoise(x) {                  // returns -1..1, C1 continuous
    var i = Math.floor(x), f = x - i;
    var a = hash(i), b = hash(i + 1);
    return (a + (b - a) * smoothstep(f)) * 2 - 1;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function linear(t, t0, t1, v0, v1) {
    if (t <= t0) return v0; if (t >= t1) return v1;
    return v0 + (v1 - v0) * (t - t0) / (t1 - t0);
  }

  var SOURCE = { sine:1, pulse:2, ramp:3, noise:4, randomWalk:5, linked:6, lumaProbe:7 };
  var MODE   = { normalized:1, signed:2, percentage:3, degrees:4, pixels:5, custom:6, gate:7, trigger:8 };

  // ---- a single rack -----------------------------------------------------
  function Rack(cfg) {
    cfg = cfg || {};
    this.id        = cfg.id || ("rack_" + Math.floor(Math.random() * 1e5));
    this.srcType   = cfg.srcType || SOURCE.sine;
    this.rate      = cfg.rate != null ? cfg.rate : 1;
    this.amount    = cfg.amount != null ? cfg.amount : 1;
    this.phase     = cfg.phase || 0;
    this.seed      = cfg.seed != null ? cfg.seed : 1;
    this.offset    = cfg.offset || 0;
    this.smooth    = cfg.smooth || 0;
    this.frameDur  = cfg.frameDur || (1 / 30);
    this.inputA    = null;                 // {rack, ch} or constant function
    this.luma      = cfg.luma || null;     // (t) => 0..1, simulates sampleImage
    // outputs: each {mode, min, max}
    var d = cfg.outputs || {};
    this.outputs = {
      A: d.A || { mode: MODE.normalized, min: 0, max: 1 },
      B: d.B || { mode: MODE.degrees,    min: -15, max: 15 },
      C: d.C || { mode: MODE.gate,       min: 0, max: 1 }
    };
  }

  Rack.prototype.connectInputA = function (rack, ch) { this.inputA = { rack: rack, ch: ch }; return this; };

  // pure unipolar source 0..1 at time tt
  Rack.prototype.srcUni = function (tt) {
    if (this.srcType === SOURCE.linked) {
      var v = this.inputA ? this.inputA.rack.output(this.inputA.ch, tt) : 0;
      return clamp(v, 0, 1);
    }
    if (this.srcType === SOURCE.lumaProbe) {
      var l = this.luma ? this.luma(tt) : 0;
      return clamp(l + this.offset, 0, 1);
    }
    var x = tt * this.rate + this.phase, bp;
    switch (this.srcType) {
      case SOURCE.sine:   bp = Math.sin(x * Math.PI * 2); break;
      case SOURCE.pulse:  bp = (x - Math.floor(x)) < 0.5 ? 1 : -1; break;
      case SOURCE.ramp:   bp = (x - Math.floor(x)) * 2 - 1; break;
      case SOURCE.noise:  bp = valueNoise(x + this.seed * 0.123); break;
      case SOURCE.randomWalk: {
        var sum = 0, amp = 1, fr = 1, norm = 0;
        for (var o = 0; o < 4; o++) { sum += amp * valueNoise(x * fr + this.seed + o * 7.7); norm += amp; amp *= 0.5; fr *= 2; }
        bp = sum / norm; break;
      }
      default: bp = 0;
    }
    bp *= this.amount;
    return (bp + 1) / 2 + this.offset;
  };

  Rack.prototype.smoothed = function (tt) {
    if (this.smooth <= 0) return this.srcUni(tt);
    var win = this.smooth * 0.5, N = Math.round(clamp(this.smooth * 24, 1, 24)), acc = 0;
    for (var i = 0; i < N; i++) { var f = N === 1 ? 0 : i / (N - 1); acc += this.srcUni(tt - win * f); }
    return acc / N;
  };

  // final mapped output for a channel at time tt
  Rack.prototype.output = function (ch, tt) {
    var o = this.outputs[ch], n = clamp(this.smoothed(tt), 0, 1);
    if (o.mode === MODE.gate) return n >= 0.5 ? o.max : o.min;
    if (o.mode === MODE.trigger) {
      for (var k = 1; k <= 3; k++) {
        var a = this.srcUni(tt - k * this.frameDur) >= 0.5;
        var b = this.srcUni(tt - (k - 1) * this.frameDur) >= 0.5;
        if (b && !a) return o.max;
      }
      return o.min;
    }
    return linear(n, 0, 1, o.min, o.max);
  };

  Rack.prototype.normalized = function (ch, tt) {  // 0..1 view for scopes
    var o = this.outputs[ch], v = this.output(ch, tt);
    return o.max === o.min ? 0 : clamp((v - o.min) / (o.max - o.min), 0, 1);
  };

  return { Rack: Rack, SOURCE: SOURCE, MODE: MODE, _util: { valueNoise: valueNoise, clamp: clamp, linear: linear } };
});
