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

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
