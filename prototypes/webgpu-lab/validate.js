/* Headless validation of the Signal Rack engine LOGIC. `node validate.js`
 * Uses the CPU reference port (signal-core-reference.js), which mirrors
 * shaders/signal_core.wgsl 1:1 so the engine can be checked without a GPU.
 * The WGSL is the canonical engine; this is the parity/regression oracle. */
var SC = require("./signal-core-reference.js");
var Rack = SC.Rack, SOURCE = SC.SOURCE, MODE = SC.MODE;
var pass = 0, fail = 0;
function ok(name, cond) { (cond ? pass++ : fail++); console.log((cond ? "  ok  " : " FAIL ") + name); }
function approx(a, b, e) { return Math.abs(a - b) <= (e || 1e-6); }

// 1. Output A changes over time
var pulse = new Rack({ srcType: SOURCE.pulse, rate: 2, outputs: { A: { mode: MODE.percentage, min: 90, max: 110 } } });
var v0 = pulse.output("A", 0.0), v1 = pulse.output("A", 0.30);
ok("Output A varies over time", v0 !== v1);
ok("Percentage output stays in [90,110]", v0 >= 90 && v0 <= 110 && v1 >= 90 && v1 <= 110);

// 2. Determinism: same seed -> same value
var n1 = new Rack({ srcType: SOURCE.noise, seed: 1941, rate: 1 });
var n2 = new Rack({ srcType: SOURCE.noise, seed: 1941, rate: 1 });
ok("Deterministic for equal seed", approx(n1.output("A", 1.234), n2.output("A", 1.234)));
var n3 = new Rack({ srcType: SOURCE.noise, seed: 7, rate: 1 });
ok("Different seed -> different signal", !approx(n1.output("A", 1.234), n3.output("A", 1.234), 1e-4));

// 3. Profiles
var sg = new Rack({ srcType: SOURCE.sine, outputs: { A: { mode: MODE.signed, min: -1, max: 1 } } });
var lo = 1e9, hi = -1e9;
for (var t = 0; t < 2; t += 1 / 60) { var v = sg.output("A", t); lo = Math.min(lo, v); hi = Math.max(hi, v); }
ok("Signed output spans ~[-1,1]", lo < -0.9 && hi > 0.9);

// 4. Gate is 0/1
var gate = new Rack({ srcType: SOURCE.sine, rate: 1, outputs: { C: { mode: MODE.gate, min: 0, max: 1 } } });
var onlyBinary = true;
for (var t2 = 0; t2 < 2; t2 += 1 / 30) { var g = gate.output("C", t2); if (g !== 0 && g !== 1) onlyBinary = false; }
ok("Gate output is strictly 0 or 1", onlyBinary);

// 5. Trigger fires (rising edges produce some 1s, not all)
var trig = new Rack({ srcType: SOURCE.pulse, rate: 3, frameDur: 1 / 30, outputs: { C: { mode: MODE.trigger, min: 0, max: 1 } } });
var ones = 0, total = 0;
for (var t3 = 0; t3 < 2; t3 += 1 / 30) { total++; if (trig.output("C", t3) === 1) ones++; }
ok("Trigger fires sometimes but not always", ones > 0 && ones < total);

// 6. Chaining: rack B linked to rack A Output A
var rackA = new Rack({ srcType: SOURCE.sine, rate: 1, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
var rackB = new Rack({ srcType: SOURCE.linked, outputs: { A: { mode: MODE.percentage, min: 0, max: 100 } } });
rackB.connectInputA(rackA, "A");
var aVal = rackA.output("A", 0.42);          // 0..1
var bVal = rackB.output("A", 0.42);          // 0..100
ok("Chained rack B reflects rack A", approx(bVal / 100, aVal, 1e-9));

// 7. Smoothing reduces variance of pulse (a box average flattens edges)
function variance(rack) { var m = 0, n = 0, s = 0; for (var t = 0; t < 2; t += 1 / 60) { var v = rack.output("A", t); n++; var d = v - m; m += d / n; s += d * (v - m); } return s / n; }
var raw = new Rack({ srcType: SOURCE.pulse, rate: 2, smooth: 0, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
var smo = new Rack({ srcType: SOURCE.pulse, rate: 2, smooth: 0.6, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
ok("Smoothing lowers variance", variance(smo) < variance(raw));

// 8. Luma probe path
var luma = new Rack({ srcType: SOURCE.lumaProbe, luma: function (t) { return 0.5 + 0.5 * Math.sin(t * 6.283); }, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
var lv = luma.output("A", 0.25);
ok("Luma probe drives output in [0,1]", lv >= 0 && lv <= 1 && lv > 0.9);

// --- engine-owned processor / sidechain / lag (moved out of the tool) ---

// 9b. Processor gate (in-engine): threshold makes output strictly 0/1
var pg = new Rack({ srcType: SOURCE.sine, rate: 1, process: { gate: 0.5 }, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
var pgBinary = true; for (var tg = 0; tg < 2; tg += 1 / 30) { var g = pg.output("A", tg); if (g !== 0 && g !== 1) pgBinary = false; }
ok("Processor gate yields strictly 0/1", pgBinary);

// 9c. Processor quantize: 4 steps -> at most 4 distinct values
var pq = new Rack({ srcType: SOURCE.ramp, rate: 1, process: { quantize: 4 }, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
var qset = {}; for (var tq = 0; tq < 1; tq += 1 / 120) qset[pq.output("A", tq).toFixed(4)] = 1;
ok("Processor quantize(4) -> <=4 levels", Object.keys(qset).length <= 4);

// 9d. Processor invert: inverted sine = 1 - original
var pa = new Rack({ srcType: SOURCE.sine, rate: 1, seed: 3 });
var pb = new Rack({ srcType: SOURCE.sine, rate: 1, seed: 3, process: { invert: true } });
ok("Processor invert == 1 - original", approx(pb.output("A", 0.37), 1 - pa.output("A", 0.37), 1e-9));

// 9e. Sidechain (engine-owned): Y amplitude modulated by a per-sample X array
var N = 64, mod = new Float32Array(N);
for (var i = 0; i < N; i++) mod[i] = 0.5 + 0.5 * Math.sin(i / N * 6.283);
var ymod = new Rack({ srcType: SOURCE.sine, rate: 3, mod: { target: "amp", depth: 0.9 }, modInput: mod, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
var ylo = 2, yhi = -2, ydistinct = {};
for (var s = 0; s < N; s++) { var yv = ymod.output("A", s / 30, s); ylo = Math.min(ylo, yv); yhi = Math.max(yhi, yv); ydistinct[yv.toFixed(3)] = 1; }
ok("Sidechain AM bounded [0,1] and varies", ylo >= 0 && yhi <= 1 && Object.keys(ydistinct).length > 10);

// 9e-2. Sidechain FM/rate: applies frequency deviation over window-relative
// time (idx*dt) so it stays usable even at a large absolute start time — the
// old code scaled absolute-time rate and aliased to noise within a frame.
var dtF = 3 / N, t0 = 512;                          // long-running page: tt ~ hundreds of seconds
var fmMod = new Float32Array(N);
for (var i = 0; i < N; i++) fmMod[i] = 0.5 + 0.5 * Math.sin(i / N * 6.283);
var fm = new Rack({ srcType: SOURCE.sine, rate: 3, seed: 1, frameDur: dtF, mod: { target: "rate", depth: 0.4 }, modInput: fmMod, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
function fmRef(idx) { var m = fmMod[idx], tt = t0 + idx * dtF;
  var fmDev = 3 * 0.4 * (m * 2 - 1) * (idx * dtF) * 0.5, sp = (1 * 0.07) - Math.floor(1 * 0.07);
  return (Math.sin((tt * 3 + fmDev + sp) * Math.PI * 2) + 1) / 2; }
var flo = 2, fhi = -2, fdistinct = {}, fmErr = 0;
for (var s = 0; s < N; s++) { var v = fm.output("A", t0 + s * dtF, s); flo = Math.min(flo, v); fhi = Math.max(fhi, v); fdistinct[v.toFixed(3)] = 1; fmErr = Math.max(fmErr, Math.abs(v - fmRef(s))); }
ok("Sidechain FM bounded [0,1] and varies at large t", flo >= 0 && fhi <= 1 && Object.keys(fdistinct).length > 10);
ok("Sidechain FM uses window-relative time (no absolute-time blowup)", fmErr < 1e-9);

// 9f. Lag (engine-owned, finite EWMA): lowers variance of a pulse
function variance(rack) { var m = 0, n = 0, s = 0; for (var t = 0; t < 2; t += 1 / 60) { var v = rack.output("A", t, Math.round(t * 60)); n++; var d = v - m; m += d / n; s += d * (v - m); } return s / n; }
var rawL = new Rack({ srcType: SOURCE.pulse, rate: 2, frameDur: 1 / 60, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
var lagL = new Rack({ srcType: SOURCE.pulse, rate: 2, frameDur: 1 / 60, process: { lag: 0.85 }, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
ok("Processor lag lowers variance", variance(lagL) < variance(rawL));

// 9g. Warp = 0 is identity; warp > 0 increases contrast (pushes a mid value toward extremes)
var wId = new Rack({ srcType: SOURCE.sine, rate: 1, seed: 5 });
var wOn = new Rack({ srcType: SOURCE.sine, rate: 1, seed: 5, process: { warp: 0.8 } });
ok("Warp 0 == identity", approx(new Rack({srcType:SOURCE.sine,rate:1,seed:5,process:{warp:0}}).output("A",0.3), wId.output("A",0.3), 1e-9));
var tw = 0.07; // a time where sine normalized is between 0.5 and 1
var nId = wId.output("A", tw), nWarp = wOn.output("A", tw);
ok("Warp increases contrast away from 0.5", Math.abs(nWarp - 0.5) >= Math.abs(nId - 0.5) - 1e-9);

// 9h. Fold = 0 is identity; fold > 0 changes the signal (adds folds)
var fId = new Rack({ srcType: SOURCE.ramp, rate: 1, process: { fold: 0 } });
var fOn = new Rack({ srcType: SOURCE.ramp, rate: 1, process: { fold: 0.7 } });
var plain = new Rack({ srcType: SOURCE.ramp, rate: 1 });
ok("Fold 0 == identity", approx(fId.output("A", 0.4), plain.output("A", 0.4), 1e-9));
var changed = false; for (var tf = 0; tf < 1; tf += 1 / 60) { if (Math.abs(fOn.output("A", tf) - plain.output("A", tf)) > 0.05) { changed = true; break; } }
ok("Fold > 0 distorts the signal", changed);

// 9i. Saturate = 0 identity; sat > 0 soft-distorts but stays in [0,1]
var satId = new Rack({ srcType: SOURCE.sine, rate: 1, seed: 9 });
var satOn = new Rack({ srcType: SOURCE.sine, rate: 1, seed: 9, process: { sat: 0.8 } });
ok("Saturate 0 == identity", approx(new Rack({ srcType: SOURCE.sine, rate: 1, seed: 9, process: { sat: 0 } }).output("A", 0.3), satId.output("A", 0.3), 1e-9));
var satChanged = false, satInRange = true;
for (var ts = 0; ts < 2; ts += 1 / 60) { var sv = satOn.output("A", ts); if (sv < 0 || sv > 1) satInRange = false; if (Math.abs(sv - satId.output("A", ts)) > 0.02) satChanged = true; }
ok("Saturate soft-distorts within [0,1]", satChanged && satInRange);

// 9j. Feathered window: 0 outside [L,R], hard left edge, feathered right ramp
var WN = 100;
var win = new Rack({ srcType: SOURCE.sine, rate: 2, sampleN: WN, win: { left: 0.2, right: 0.8, featherL: 0, featherR: 0.2 }, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
ok("Window: zero before left edge", win.output("A", 0.05, Math.round(0.1 * (WN - 1))) === 0);
ok("Window: zero after right edge", win.output("A", 0.95, Math.round(0.95 * (WN - 1))) === 0);
// inside, full (away from feather)
var insideIdx = Math.round(0.5 * (WN - 1));
var base = new Rack({ srcType: SOURCE.sine, rate: 2, sampleN: WN, outputs: { A: { mode: MODE.normalized, min: 0, max: 1 } } });
ok("Window: unscaled in the interior", approx(win.output("A", 0.5, insideIdx), base.output("A", 0.5, insideIdx), 1e-9));
// right feather ramps down (value near right edge < interior envelope)
var nearRight = Math.round(0.78 * (WN - 1));
ok("Window: right feather attenuates", win.windowEnv(nearRight) < 1 && win.windowEnv(nearRight) > 0);
ok("Window default (0..1) is a no-op", new Rack({ srcType: SOURCE.sine, sampleN: WN }).windowEnv(insideIdx) === 1);

// 9k. Third signal (distort): zDepth phase-bends; 0 = identity, >0 changes the wave
var zbuf = new Float32Array(WN); for (var zi=0; zi<WN; zi++) zbuf[zi] = 0.5 + 0.5*Math.sin(zi/WN*6.283);
var zOff = new Rack({ srcType: SOURCE.sine, rate: 2, z: { input: zbuf, depth: 0 } });
var zOn  = new Rack({ srcType: SOURCE.sine, rate: 2, z: { input: zbuf, depth: 0.5 } });
ok("Distort depth 0 == identity", approx(zOff.output("A",0.3,10), new Rack({srcType:SOURCE.sine,rate:2}).output("A",0.3,10), 1e-9));
var zChanged=false; for (var zt=0; zt<2; zt+=1/60){ var k=Math.round(zt*30)%WN; if (Math.abs(zOn.output("A",zt,k)-zOff.output("A",zt,k))>0.02){ zChanged=true; break; } }
ok("Distort depth > 0 bends the signal", zChanged);

// --- audio lane source (Tympo) --------------------------------------------
var TL = require("./tympo-lane.js");
var NORM = { A: { mode: MODE.normalized, min: 0, max: 1 } };

// 10a. audioLane reads the per-sample external input (binding 2) + offset, clamped
var laneIn = new Float32Array([0, 0.25, 0.5, 0.95, 1]);
var al = new Rack({ srcType: SOURCE.audioLane, extInput: laneIn, offset: 0.1, outputs: NORM });
ok("audioLane reads extInput[idx] + offset", approx(al.output("A", 0, 1), 0.35, 1e-7) && approx(al.output("A", 0, 2), 0.6, 1e-7));
ok("audioLane clamps to [0,1]", al.output("A", 0, 3) === 1 && new Rack({ srcType: SOURCE.audioLane, extInput: laneIn, offset: -0.1, outputs: NORM }).output("A", 0, 0) === 0);
ok("audioLane is per-sample (index, not time)", al.output("A", 0, 2) === al.output("A", 123.4, 2));
ok("lumaInput alias still feeds lumaProbe", new Rack({ srcType: SOURCE.lumaProbe, lumaInput: laneIn, outputs: NORM }).output("A", 0, 2) === 0.5);

// 10b. levelToInput: linear interpolation between published samples, hold at ends
var lvl = [{ time: 0, value: 0 }, { time: 240, value: 1 }, { time: 480, value: 0.5 }];   // 0, 5, 10 ms @ 48 kHz
var li = TL.levelToInput(lvl, 48000, -0.005, 0.0025, 8), liWant = [0, 0, 0, 0.5, 1, 0.75, 0.5, 0.5];
ok("levelToInput interpolates and holds at the ends", liWant.every(function (v, i) { return approx(li[i], v, 1e-6); }));
var liLoop = TL.levelToInput(lvl, 48000, 0.0125, 0.0025, 1, { loop: 0.01 });           // 12.5 ms wraps to 2.5 ms
ok("levelToInput loop wraps lane time", approx(liLoop[0], 0.5, 1e-6));

// 10c. hitsToInput: strength * e^(-(t-hit)/decay) for t >= hit, max over overlaps
var hits = [{ time: 4800, strength: 0.8, type: "hit" }, { time: 5760, strength: 0.5, type: "hit" }, { time: 100, strength: 1, type: "onset" }];
var hi = TL.hitsToInput(hits, 48000, 0, 0.01, 40, { decay: 0.05 });          // hits at 0.10 s and 0.12 s
ok("hitsToInput: 0 before, strength at, e^-1 one decay after", hi[9] === 0 && approx(hi[10], 0.8, 1e-6) && approx(hi[15], 0.8 * Math.exp(-1), 1e-6));
ok("hitsToInput: overlapping hits take the max (not the sum)", approx(hi[12], 0.8 * Math.exp(-0.4), 1e-6) && approx(hi[13], 0.8 * Math.exp(-0.6), 1e-6));
var h0 = TL.hitsToInput([{ time: 5040, strength: 0.7, type: "hit" }], 48000, 0, 0.01, 40, { decay: 0 });   // 0.105 s
var nz = 0; for (var i = 0; i < 40; i++) if (h0[i] !== 0) nz++;
ok("hitsToInput: decay 0 = one frame (first sample at/after the hit)", nz === 1 && approx(h0[11], 0.7, 1e-6));
var hl = TL.hitsToInput([{ time: 4800, strength: 1, type: "hit" }], 48000, 1.0, 0.01, 20, { decay: 0.05, loop: 1.0 });
ok("hitsToInput loop repeats hits each cycle", approx(hl[10], 1, 1e-6) && approx(hl[15], Math.exp(-1), 1e-6));

// 10d. fromTympo: bundle { sampleRate, level, hits } and a seconds timeline
var tb = TL.fromTympo({ sampleRate: 48000, level: [{ time: 9600, value: 0.6 }, { time: 0, value: 0.2 }], hits: [{ time: 4800, strength: 0.9, type: "hit" }] });
var tt2 = TL.fromTympo({ timeline: [{ time: 0.1, level: 0.3, hit: true, strength: 0.9 }, { time: 0.2, level: 0.6 }] });
ok("fromTympo accepts a bundle (sorted) and a seconds timeline", tb.level[0].time === 0 && tb.hits.length === 1 && approx(tb.duration, 0.2, 1e-9) &&
   tt2.level.length === 2 && approx(tt2.level[1].time, 9600, 1e-6) && tt2.hits.length === 1 && tt2.hits[0].strength === 0.9);
var tm = TL.fromTympo({ sampleRate: 44100, lanes: { kick: { hits: [{ time: 441, strength: 1 }] }, hats: { level: [{ time: 0, value: 1 }] } } }, { lane: "hats" });
ok("fromTympo picks a named lane from a multi-lane bundle", tm.name === "hats" && tm.level.length === 1 && tm.sampleRate === 44100);
var lanePath = TL.laneToInput(tb, "level", 0.05, 0.05, 3);
ok("laneToInput -> audioLane rack reproduces the lane", approx(new Rack({ srcType: SOURCE.audioLane, extInput: lanePath, outputs: NORM }).output("A", 0, 1), 0.4, 1e-6));

// --- spring (true overshoot) -------------------------------------------------
// Step 0 -> 1 through an audioLane input; the analytic 2nd-order overshoot is
// e^(-zeta*pi/sqrt(1-zeta^2)) (0.372 at zeta = 0.3).
function springStep(zeta, fd, hz, amount, outs) {
  var n = Math.ceil(4 / hz / fd) + 40, step = new Float32Array(n);
  for (var i = 20; i < n; i++) step[i] = 1;
  var r = new Rack({ srcType: SOURCE.audioLane, extInput: step, frameDur: fd, process: { spring: amount != null ? amount : 1, springHz: hz, springDamping: zeta }, outputs: outs || NORM });
  var mx = -9, last = 0;
  for (var i = 0; i < n; i++) { last = r.output("A", i * fd, i); if (last > mx) mx = last; }
  return { peak: mx, last: last };
}
var OS03 = Math.exp(-0.3 * Math.PI / Math.sqrt(1 - 0.09));
var sp60 = springStep(0.3, 1 / 60, 2), sp600 = springStep(0.3, 1 / 600, 2);
ok("Spring zeta=0.3 overshoots by the analytic amount (60 fps)", Math.abs((sp60.peak - 1) - OS03) < 0.02);
ok("Spring zeta=0.3 same overshoot on a fine grid (strided taps)", Math.abs((sp600.peak - 1) - OS03) < 0.02);
ok("Spring zeta~1 does not overshoot", springStep(1.0, 1 / 60, 2).peak <= 1 + 1e-9 && springStep(0.97, 1 / 60, 2).peak <= 1 + 1e-6);
ok("Spring settles to the input (unit DC gain)", approx(sp60.last, 1, 1e-9));
ok("Spring amount 0.5 = wet/dry mix (half the overshoot)", approx(springStep(0.3, 1 / 60, 2, 0.5).peak - 1, (sp60.peak - 1) / 2, 1e-6));
var spPct = springStep(0.3, 1 / 60, 2, 1, { A: { mode: MODE.percentage, min: 100, max: 118 } });
ok("Spring overshoot reaches the outputs (headroom past the range)", spPct.peak > 118 + 18 * 0.3);
var sq = new Rack({ srcType: SOURCE.pulse, rate: 0.5, frameDur: 1 / 60, process: { spring: 1, springHz: 3, springDamping: 0.3 }, outputs: NORM });
var sqHi = -9, sqLo = 9; for (var i = 0; i < 240; i++) { var v = sq.output("A", 10 + i / 60, i); sqHi = Math.max(sqHi, v); sqLo = Math.min(sqLo, v); }
ok("Spring on a generator step bounces both ways", sqHi > 1.3 && sqLo < -0.3);
ok("springStride: 1 at 60 fps, strided on a fine grid", SC.springStride(2, 0.3, 1 / 60) === 1 && SC.springStride(2, 0.3, 1 / 600) === 9);
var pk = new Rack({ process: { spring: 0.7, springHz: 2.5, springDamping: 0.2 } }).pack(0, 1 / 60, 8);
ok("pack() puts spring in v10.yzw (floats 41..43)", pk.length === 44 && approx(pk[41], 0.7, 1e-7) && approx(pk[42], 2.5, 1e-7) && approx(pk[43], 0.2, 1e-7));

// --- regression: spring off == the pre-spring engine, bit for bit --------------
// Hash (FNV-1a over the float64 bits) of every A/B/C output over 78 configs:
// all sources, processors, lag, smoothing, sidechain, window, distort, linked.
// Golden recorded from the engine before the spring/audioLane change (a83b90f).
function battery(extra) {
  var BN = 48, fb = new Float64Array(1), u32 = new Uint32Array(fb.buffer), h = 0x811c9dc5, count = 0;
  function mix(v) { fb[0] = v; for (var w = 0; w < 2; w++) { var x = u32[w]; for (var b = 0; b < 4; b++) { h ^= (x >>> (b * 8)) & 255; h = Math.imul(h, 0x01000193) >>> 0; } } count++; }
  var ramp = new Float32Array(BN), wob = new Float32Array(BN);
  for (var i = 0; i < BN; i++) { ramp[i] = i / (BN - 1); wob[i] = 0.5 + 0.5 * Math.sin(i * 0.37); }
  var outs = { A: { mode: MODE.percentage, min: 90, max: 110 }, B: { mode: MODE.signed, min: -1, max: 1 }, C: { mode: MODE.trigger, min: 0, max: 1 } };
  var outsG = { A: { mode: MODE.normalized, min: 0, max: 1 }, B: { mode: MODE.degrees, min: -15, max: 15 }, C: { mode: MODE.gate, min: 0, max: 1 } };
  var procs = [null, { gain: 1.4, bias: 0.05 }, { sat: 0.6, warp: 0.4 }, { fold: 0.5, invert: true }, { rectify: true, quantize: 5 }, { gate: 0.55 }, { lag: 0.3 }, { lag: 0.85, gain: 0.8 }, { lag: 0.97, warp: -0.6, sat: 0.2 }];
  var cfgs = [];
  [1, 2, 3, 4, 5, 7, 8, 9].forEach(function (s) { procs.forEach(function (p, pi) {
    cfgs.push({ srcType: s, rate: 1.7, phase: 0.13, amount: 0.9, seed: 1941 + pi, offset: pi % 2 ? 0.07 : 0, smooth: [0, 0.3, 0.07][pi % 3], frameDur: 1 / 30, process: p, lumaInput: s === 7 ? wob : null, sampleN: BN, outputs: pi % 2 ? outs : outsG });
  }); });
  cfgs.push({ srcType: 1, rate: 3, mod: { target: "amp", depth: 0.8 }, modInput: wob, sampleN: BN, outputs: outs });
  cfgs.push({ srcType: 8, rate: 2, mod: { target: "rate", depth: 0.4 }, modInput: ramp, frameDur: 1 / 60, sampleN: BN, outputs: outsG });
  cfgs.push({ srcType: 4, rate: 2, seed: 77, mod: { target: "phase", depth: 0.6 }, modInput: wob, process: { lag: 0.6 }, sampleN: BN, outputs: outs });
  cfgs.push({ srcType: 1, rate: 2, sampleN: BN, win: { left: 0.2, right: 0.8, featherL: 0.1, featherR: 0.2 }, outputs: outsG });
  cfgs.push({ srcType: 5, rate: 1, sampleN: BN, z: { input: wob, depth: 0.4 }, process: { lag: 0.5 }, outputs: outs });
  cfgs.forEach(function (c) {
    var r = new Rack(extra ? extra(c) : c);
    for (var i = 0; i < BN; i++) { var tt = 12.3 + i / 30; mix(r.output("A", tt, i)); mix(r.output("B", tt, i)); mix(r.output("C", tt, i)); }
  });
  var la = new Rack({ srcType: 1, rate: 1 }), lcfg = { srcType: 6, outputs: outs, process: { lag: 0.4 } };
  var lb = new Rack(extra ? extra(lcfg) : lcfg); lb.connectInputA(la, "A");
  for (var i = 0; i < BN; i++) mix(lb.output("A", 3 + i / 30, i));
  return ("00000000" + h.toString(16)).slice(-8) + "/" + count;
}
var GOLDEN = "657d7a5f/11136";
ok("Spring off == pre-spring engine bit for bit (78 configs, golden " + GOLDEN + ")", battery() === GOLDEN);
ok("spring:0 with spring params set == no spring, bit for bit", battery(function (c) {
  c = Object.assign({}, c); c.process = Object.assign({}, c.process || {}, { spring: 0, springHz: 5, springDamping: 0.1 }); return c; }) === GOLDEN);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
