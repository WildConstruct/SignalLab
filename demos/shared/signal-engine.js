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

  function aeNum(v) { return (Math.round((+v || 0) * 1e4) / 1e4).toString(); }
  var DRIVE_LABEL = { x: "Channel X", y: "Channel Y", mult: "X × Y (ring)", mix: "(X + Y)/2", diff: "|X − Y|", min: "min(X, Y)", max: "max(X, Y)" };

  /**
   * Self-contained After Effects expression reproducing this driver: both
   * channels (source/rate/phase/amount/offset/smooth/seed) → normalized →
   * combine → linear remap into `range` ([min,max], default [0,1]). Mirrors the
   * tool's emitter for the core sources; no plugin needed. (Processor/sidechain
   * /window are not part of the shared demo driver and are omitted.)
   */
  Driver.prototype.toExpression = function (range) {
    range = range || [0, 1];
    var dm = this.drive, needY = dm !== "x", L = [];
    L.push("// Signal Rack — generated After Effects expression");
    L.push("// Driver: " + (DRIVE_LABEL[dm] || "Channel X") + " → property. Paste onto the target property in AE.");
    L.push("function frac(x){ return x-Math.floor(x); }");
    L.push("function hsh(n){ var v=Math.sin(n)*43758.5453123; return v-Math.floor(v); }");
    L.push("function vnoise(x){ var i=Math.floor(x), f=x-i, a=hsh(i), b=hsh(i+1); return (a+(b-a)*(f*f*(3-2*f)))*2-1; }");
    L.push("var T = time;");
    emitChan("X", this.x);
    L.push("var nx = clamp(smoothedX(T),0,1);");
    if (needY) { emitChan("Y", this.y); L.push("var ny = clamp(smoothedY(T),0,1);"); }
    var drv = { y: "ny", mult: "nx*ny", mix: "(nx+ny)/2", diff: "Math.abs(nx-ny)", min: "Math.min(nx,ny)", max: "Math.max(nx,ny)" }[dm] || "nx";
    L.push("var n = " + drv + ";");
    L.push("linear(n, 0, 1, " + aeNum(range[0]) + ", " + aeNum(range[1]) + ");");
    return L.join("\n");

    function emitChan(S, c) {
      var sc = +c.src;
      L.push("var rate" + S + "=" + aeNum(c.rate) + ", off" + S + "=" + aeNum(c.offset) + ", smooth" + S + "=" + aeNum(c.smooth) + ", seed" + S + "=" + aeNum(c.seed) + ", amount" + S + "=" + aeNum(c.amount) + ", phase" + S + "=" + aeNum(c.phase) + ";");
      L.push("function srcUni" + S + "(tt){ var x=tt*rate" + S + "+phase" + S + "+(seed" + S + "*0.07-Math.floor(seed" + S + "*0.07)), fx=x-Math.floor(x), bp;");
      if (sc === 1) L.push("  bp=Math.sin(x*2*Math.PI);");
      else if (sc === 2) L.push("  bp=fx<0.5?1:-1;");
      else if (sc === 3) L.push("  bp=fx*2-1;");
      else if (sc === 4) L.push("  bp=vnoise(x+seed" + S + "*0.123);");
      else if (sc === 5) L.push("  var sum=0,a=1,fr=1,nm=0; for(var o=0;o<4;o++){ sum+=a*vnoise(x*fr+seed" + S + "+o*7.7); nm+=a; a*=0.5; fr*=2; } bp=sum/nm;");
      else if (sc === 8) L.push("  bp=4*Math.abs(fx-0.5)-1;");
      else if (sc === 9) L.push("  bp=fx<0.2?1:-1;");
      else L.push("  bp=Math.sin(x*2*Math.PI);");
      L.push("  bp*=amount" + S + "; return (bp+1)/2 + off" + S + "; }");
      L.push("function smoothed" + S + "(tt){ if(smooth" + S + "<=0) return srcUni" + S + "(tt);");
      L.push("  var win=smooth" + S + "*0.5, M=Math.round(Math.max(1,Math.min(24,smooth" + S + "*24))), acc=0;");
      L.push("  for(var i=0;i<M;i++){ var f=(M==1)?0:i/(M-1); acc+=srcUni" + S + "(tt-win*f); } return acc/M; }");
    }
  };

  function create(cfg) { return new Driver(cfg); }
  return { create: create, Driver: Driver, combine: combine, SignalCore: SignalCore, SRCIDX: SRCIDX };
});
