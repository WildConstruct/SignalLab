/* Runnable validation of the Signal Rack core. `node validate.js` */
var SC = require("./signal-core.js");
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

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
