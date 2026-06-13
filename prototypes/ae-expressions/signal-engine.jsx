/*
 * SIGNAL RACK — SIGNAL ENGINE EXPRESSION
 * -------------------------------------------------------------------------
 * This is the expression that lives on each Output slider of a Signal Rack.
 * It is self-contained, deterministic, and never reads its OWN value at a
 * previous time (no recursive valueAtTime), so it stays O(window) per frame
 * instead of O(timeline).
 *
 * The token {CH} is replaced by A / B / C when the rack is built by the
 * SignalRack.jsx script. To paste this by hand, replace every {CH} with the
 * output letter you are wiring (A, B, or C).
 *
 * STATUS: Written against After Effects' documented expression language
 * (sampleImage, noise, seedRandom, linear, clamp, thisComp.frameDuration,
 * effect("name")("Menu"/"Slider"/"Point"/"Layer")). These are all stable,
 * long-standing API surfaces. Behaviour described in comments is from the
 * Adobe Expression Reference; exact numeric output should still be eyeballed
 * once in AE (see tests/signal-output-tests.md).
 * -------------------------------------------------------------------------
 */

// ---- safe accessors -------------------------------------------------------
var R = thisLayer;
function eff(n){ try { return R.effect(n); } catch (e) { return null; } }
function num(n, prop, def){ var e = eff(n); return (e !== null) ? e(prop) : def; }

// ---- rack parameters ------------------------------------------------------
var srcType = num("SR | Source Type", "Menu",   1);   // 1..7 (see below)
var rate    = num("SR | Rate",        "Slider", 1);   // Hz (cycles / second)
var amount  = num("SR | Amount",      "Slider", 1);   // gain on the raw signal
var phase   = num("SR | Phase",       "Slider", 0);   // cycle offset, in turns (0..1)
var seed    = num("SR | Seed",        "Slider", 1);   // deterministic seed
var offset  = num("SR | Offset",      "Slider", 0);   // DC offset added to normalized signal
var smooth  = num("SR | Smooth",      "Slider", 0);   // 0..1 lag / box-average amount
var inA     = num("SR | Input A",     "Slider", 0);   // sidechain input (0..1 expected)

var TWO_PI = Math.PI * 2;
seedRandom(seed, true);

/*
 * Source Type menu order:
 *   1 Sine        2 Pulse       3 Ramp        4 Noise
 *   5 RandomWalk  6 Linked(InA) 7 LumaProbe
 */

// ---- pure source: unipolar 0..1 value at an arbitrary time tt -------------
function srcUni(tt){
  if (srcType == 6){                       // Linked: pass Input A straight through
    return clamp(inA, 0, 1);
  }
  if (srcType == 7){                       // Luma Probe: sample a layer's pixels
    var L = eff("SR | Probe Source");
    var P = eff("SR | Probe Point");
    var rad = num("SR | Probe Radius", "Slider", 0.5);
    try {
      var lyr = L("Layer");
      if (lyr && lyr.index != thisLayer.index){
        var col = lyr.sampleImage(P("Point"), [rad, rad], true, tt); // [r,g,b,a] 0..1, post-effect
        var lum = 0.299*col[0] + 0.587*col[1] + 0.114*col[2];        // Rec.601 luma
        return clamp(lum + offset, 0, 1);
      }
    } catch (e) {}
    return 0;
  }

  var x = tt * rate + phase;
  var bp; // bipolar -1..1
  if (srcType == 1){                       // Sine
    bp = Math.sin(x * TWO_PI);
  } else if (srcType == 2){                // Pulse (square, 50% duty)
    bp = ((x - Math.floor(x)) < 0.5) ? 1 : -1;
  } else if (srcType == 3){                // Ramp / saw
    bp = (x - Math.floor(x)) * 2 - 1;
  } else if (srcType == 4){                // Noise (smooth, Perlin-style)
    bp = noise(x + seed * 0.123);
  } else if (srcType == 5){                // Random walk (fBm approximation, deterministic)
    var sum = 0, amp = 1, fr = 1, norm = 0;
    for (var o = 0; o < 4; o++){ sum += amp * noise(x*fr + seed + o*7.7); norm += amp; amp *= 0.5; fr *= 2.0; }
    bp = sum / norm;
  } else {
    bp = 0;
  }
  bp *= amount;
  return (bp + 1) / 2 + offset;            // -> unipolar 0..1 (+ DC offset)
}

// ---- smoothing: finite box average of the SOURCE over a short window ------
// Bounded (<=24 sub-samples). No recursion, deterministic. Real one-pole lag
// would need previous-output state, which is not available without recursive
// self-reads; a finite moving average is the honest expression-only choice.
function smoothed(tt){
  if (smooth <= 0) return srcUni(tt);
  var win = smooth * 0.5;                              // up to 0.5s look-back
  var N = Math.round(clamp(smooth * 24, 1, 24));
  var acc = 0;
  for (var i = 0; i < N; i++){
    var f = (N == 1) ? 0 : (i / (N - 1));
    acc += srcUni(tt - win * f);
  }
  return acc / N;
}

var n = clamp(smoothed(time), 0, 1);       // normalized 0..1 base for this frame

// ---- output profile mapping ----------------------------------------------
/*
 * Output Mode menu order:
 *   1 Normalized 0..1   2 Signed -1..1   3 Percentage   4 Degrees
 *   5 Pixels            6 Custom range   7 Gate         8 Trigger
 * Modes 1-6 are continuous and just remap n into [Min,Max].
 * Min/Max carry the actual range; the Mode mainly chose sensible defaults
 * when the rack was built. Gate/Trigger are stateless edge logic.
 */
var mode = num("SR | Output {CH} Mode", "Menu",   1);
var mn   = num("SR | Output {CH} Min",  "Slider", 0);
var mx   = num("SR | Output {CH} Max",  "Slider", 1);
var out;

if (mode == 7){                            // Gate: above midpoint -> Max, else Min
  out = (n >= 0.5) ? mx : mn;
} else if (mode == 8){                      // Trigger: rising-edge pulse, held pulseFrames
  var fd = thisComp.frameDuration;
  var pulseFrames = 3;
  var fired = 0;
  for (var k = 1; k <= pulseFrames; k++){
    var a = srcUni(time - k * fd) >= 0.5;
    var b = srcUni(time - (k - 1) * fd) >= 0.5;
    if (b && !a){ fired = 1; break; }       // crossed from low to high
  }
  out = fired ? mx : mn;
} else {                                    // continuous remap (linear() clamps to [mn,mx])
  out = linear(n, 0, 1, mn, mx);
}

out
