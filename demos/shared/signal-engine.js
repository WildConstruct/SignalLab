/*
 * SIGNAL RACK — shared signal-engine driver  (demos/shared/signal-engine.js)
 * -------------------------------------------------------------------------
 * THE one contract every web demo consumes. Renderers read `n`, `bufX`, `bufY`
 * and NOTHING else — they never do signal math. This module is a thin wrapper
 * around the canonical CPU reference engine (signal-core-reference.js), which is
 * itself bit-parity with the WGSL product engine, so a look authored in any demo
 * is portable to the After-Effects plugin unchanged.
 *
 * Two channels (X, Y), each a SignalCore.Rack producing a normalized 0..1
 * stream, are combined exactly as tool/index.html's `combine()` does:
 *
 *     X ─┐
 *        ├─ combine(x, y) ─→  n ∈ [0,1]   (the driver value)
 *     Y ─┘   x · y · x×y · mix · diff · min · max
 *
 * Public surface (see docs/web-demos/README.md):
 *     driver.sample(t)        -> { n, x, y }      live combined value @ t
 *     driver.window(t, M)     -> { bufX, bufY, n } M samples back from t
 *     driver.fromRecipe(json) -> driver           load a recipe / .wcx setup
 *     driver.set(patch)       -> driver           update channels / drive / proc
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("../../prototypes/webgpu-lab/signal-core-reference.js"));
  else root.SignalEngine = factory(root.SignalCore);
})(typeof self !== "undefined" ? self : this, function (SignalCore) {
  "use strict";
  if (!SignalCore) throw new Error("SignalEngine requires SignalCore (signal-core-reference.js) to be loaded first.");
  var Rack = SignalCore.Rack, MODE = SignalCore.MODE;

  // name -> source code, matching tool/index.html's SRCIDX
  var SRCIDX = { sine:1, square:2, saw:3, pulse:9, ramp:3, noise:4, randomWalk:5,
                 linked:6, lumaProbe:7, triangle:8, pulseNarrow:9 };
  function srcCode(v) { return typeof v === "number" ? v : (SRCIDX[v] || 1); }

  function chan(c) {
    c = c || {};
    return { src: srcCode(c.src != null ? c.src : 1), rate: c.rate != null ? c.rate : 2,
             phase: c.phase || 0, amount: c.amount != null ? c.amount : 1,
             offset: c.offset || 0, smooth: c.smooth || 0, seed: c.seed != null ? c.seed : 1941 };
  }

  // EXACTLY tool/index.html combine() — keep in sync; this is the driver definition.
  function combine(mode, a, b) {
    switch (mode) {
      case "y":    return b;
      case "mult": return a * b;
      case "mix":  return (a + b) / 2;
      case "diff": return Math.abs(a - b);
      case "min":  return Math.min(a, b);
      case "max":  return Math.max(a, b);
      default:     return a; // "x"
    }
  }

  function Driver(cfg) {
    cfg = cfg || {};
    this.x = chan(cfg.x);
    this.y = chan(cfg.y || cfg.x);
    this.drive = cfg.drive || "x";              // x | y | mult | mix | diff | min | max
    this.proc = cfg.proc || null;               // shaping stage (gain/bias/sat/warp/fold/...)
    this.span = cfg.span != null ? cfg.span : 3; // seconds of signal across a full window
    this.N = cfg.N || 1024;                      // default window resolution
  }

  // Build a SignalCore.Rack for a channel at the given per-sample dt.
  Driver.prototype._rack = function (c, dt) {
    return new Rack({ srcType: c.src, rate: c.rate, phase: c.phase, amount: c.amount,
      offset: c.offset, smooth: c.smooth, seed: c.seed, frameDur: dt,
      process: this.proc, sampleN: this.N, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
  };

  /**
   * M samples ending at time t (start = t-(M-1)*dt). Returns the raw normalized
   * channel buffers plus the live combined driver value `n` at the window end.
   */
  Driver.prototype.window = function (t, M) {
    M = M || this.N;
    var dt = this.span / M, start = t - (M - 1) * dt;
    var rx = this._rack(this.x, dt), ry = this._rack(this.y, dt);
    var bufX = new Float32Array(M), bufY = new Float32Array(M);
    for (var i = 0; i < M; i++) {
      bufX[i] = rx.output("A", start + i * dt, i);
      bufY[i] = ry.output("A", start + i * dt, i);
    }
    var n = combine(this.drive, bufX[M - 1], bufY[M - 1]);
    return { bufX: bufX, bufY: bufY, n: n };
  };

  /** Live combined value (and raw channels) at time t. */
  Driver.prototype.sample = function (t) {
    var w = this.window(t, this.N);
    return { n: w.n, x: w.bufX[this.N - 1], y: w.bufY[this.N - 1] };
  };

  /** Patch channels / drive / proc / span in place. */
  Driver.prototype.set = function (p) {
    p = p || {};
    if (p.x) this.x = chan(Object.assign({}, this.x, p.x));
    if (p.y) this.y = chan(Object.assign({}, this.y, p.y));
    if (p.drive) this.drive = p.drive;
    if ("proc" in p) this.proc = p.proc;
    if (p.span != null) this.span = p.span;
    return this;
  };

  /** Load a Signal Lab recipe JSON (the buildFullRecipe() shape from tool/). */
  Driver.prototype.fromRecipe = function (r) {
    if (!r) return this;
    var s = r.source || {}, y = r._channelY || {}, pr = r.process || {};
    this.x = chan({ src: s.type, rate: s.rate, amount: s.amount, phase: s.phase,
                    offset: s.offset, smooth: pr.smooth, seed: (r.timebase && r.timebase.seed) });
    this.y = chan({ src: y.type, rate: y.rate, amount: y.amount, phase: y.phase,
                    offset: y.offset, smooth: y.smooth, seed: y.seed });
    this.drive = r._drive || this.drive;
    this.proc = { gain: pr.gain, bias: pr.bias, quantize: pr.quantize, gate: pr.gate,
                  lag: pr.lag, warp: pr.warp, fold: pr.fold, sat: pr.sat,
                  invert: pr.invert, rectify: pr.rectify };
    return this;
  };

  function create(cfg) { return new Driver(cfg); }
  return { create: create, Driver: Driver, combine: combine, SignalCore: SignalCore, SRCIDX: SRCIDX };
});
