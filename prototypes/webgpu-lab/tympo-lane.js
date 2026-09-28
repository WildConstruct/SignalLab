/*
 * SIGNAL RACK — Tympo lane -> per-sample engine input (browser + node)
 * -------------------------------------------------------------------------
 * Tympo publishes band-passed audio lanes as
 *     level : [{ time: samplePosition, value: 0..1 }]            (e.g. 200 Hz cadence)
 *     hits  : [{ time: samplePosition, strength: 0..1, type: "hit" }]
 *     motion: [{ time: samplePosition, value }]   (Tympo C2's move stage, when on;
 *             decayPulse / smooth are 0..1, a spring swings -1..1)
 * with `time` in samples at the lane's sampleRate (usually 48000).
 *
 * The engine's audioLane source (10) reads a per-sample external input buffer
 * (binding 2, `extIn` / Rack `extInput`): sample i of a dispatch sits at
 * startTime + i*dt seconds. These pure helpers render a lane onto that grid:
 *
 *     levelToInput(level, sampleRate, startTime, dt, N [, {loop}])
 *         linear interpolation between published samples, holding the first /
 *         last value outside them.
 *     hitsToInput(hits, sampleRate, startTime, dt, N [, {decay, loop}])
 *         each hit -> strength * e^(-(t - hitTime)/decay) for t >= hitTime,
 *         max over overlapping hits; decay 0 (default) = the one grid sample
 *         at/after the hit.
 *     fromTympo(bundle [, {lane}])   normalise an export (see below)
 *     laneNames(bundle)              lane names of a multi-lane bundle ([] if single)
 *     laneToInput(lane, "level"|"hits"|"motion"|"motionCentred", startTime, dt, N [, opts])
 *         "motionCentred" maps motion m to 0.5 + 0.5*m, so a spring's swing
 *         below rest survives the source's 0..1 clamp (rest reads 0.5).
 *
 * `loop` (seconds, 0 = off) wraps lane time so a preview can cycle a track.
 * Deterministic, no dependencies; the result is a Float32Array of length N.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TympoLane = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DEFAULT_RATE = 48000;

  // lane time (seconds) of grid sample i, wrapped into [0, loop) when looping
  function gridTime(startTime, dt, i, loop) { var t = startTime + i * dt; return loop > 0 ? t - Math.floor(t / loop) * loop : t; }

  // level: ascending { time (samples), value } -> N grid samples
  function levelToInput(level, sampleRate, startTime, dt, N, opts) {
    var out = new Float32Array(N), n = level ? level.length : 0;
    if (!n) return out;
    var sr = sampleRate || DEFAULT_RATE, loop = (opts && opts.loop) || 0;
    var first = level[0], last = level[n - 1];
    for (var i = 0; i < N; i++) {
      var s = gridTime(startTime, dt, i, loop) * sr;               // lane sample position
      if (s <= first.time) { out[i] = first.value; continue; }      // hold at the ends
      if (s >= last.time) { out[i] = last.value; continue; }
      var lo = 0, hi = n - 1;                                       // level[lo].time <= s < level[hi].time
      while (hi - lo > 1) { var m = (lo + hi) >> 1; if (level[m].time <= s) lo = m; else hi = m; }
      var a = level[lo], b = level[hi];
      out[i] = a.value + (b.value - a.value) * (s - a.time) / (b.time - a.time);
    }
    return out;
  }

  // hits: { time (samples), strength, type } -> N grid samples of decaying kicks
  function hitsToInput(hits, sampleRate, startTime, dt, N, opts) {
    opts = opts || {};
    var out = new Float32Array(N), sr = sampleRate || DEFAULT_RATE;
    var decay = Math.max(0, opts.decay || 0), loop = opts.loop || 0;
    var reach = decay * 12, tEnd = startTime + (N - 1) * dt;        // e^-12 ~ 6e-6: tail negligible past this
    for (var h = 0; h < (hits ? hits.length : 0); h++) {
      var hit = hits[h];
      if (hit.type && hit.type !== "hit") continue;
      var th = hit.time / sr, st = hit.strength != null ? hit.strength : 1;
      // every (looped) repeat of the hit that can touch the grid
      var m0 = loop > 0 ? Math.ceil((startTime - reach - dt - th) / loop) : 0;
      var m1 = loop > 0 ? Math.floor((tEnd - th) / loop) : 0;
      for (var m = m0; m <= m1; m++) {
        var tk = th + m * loop, first = Math.ceil((tk - startTime) / dt - 1e-7);   // first sample at/after the hit
        if (decay <= 0) { if (first >= 0 && first < N && st > out[first]) out[first] = st; continue; }
        for (var i = Math.max(0, first); i < N; i++) {
          var d = Math.max(0, startTime + i * dt - tk);
          if (d > reach) break;
          var v = st * Math.exp(-d / decay);
          if (v > out[i]) out[i] = v;
        }
      }
    }
    return out;
  }

  function byTime(a, b) { return a.time - b.time; }

  function laneNames(obj) {
    if (!obj || !obj.lanes) return [];
    return Array.isArray(obj.lanes) ? obj.lanes.map(function (l, i) { return l.name || l.band || l.id || String(i); }) : Object.keys(obj.lanes);
  }

  // Normalise a Tympo export to { name, sampleRate, level, hits, duration (s) }.
  // Accepts a lane/bundle { sampleRate, level, hits }, a bundle of several lanes
  // ({ lanes: { name: lane } } or { lanes: [lane] }; opts.lane picks one, else
  // the first), or a { timeline: [{ time (s), level, hit, strength }] } export.
  function fromTympo(obj, opts) {
    if (typeof obj === "string") obj = JSON.parse(obj);
    obj = obj || {};
    var want = opts && opts.lane, src = obj, name = obj.name || obj.band || "";
    if (obj.lanes) {
      var names = laneNames(obj);
      var k = want != null && names.indexOf(String(want)) >= 0 ? names.indexOf(String(want)) : 0;
      src = Array.isArray(obj.lanes) ? obj.lanes[k] : obj.lanes[names[k]];
      name = names[k];
    }
    src = src || {};
    var sr = src.sampleRate || obj.sampleRate || DEFAULT_RATE, level = [], hits = [], motion = [];
    if (Array.isArray(src.timeline)) {                             // seconds-based timeline
      src.timeline.forEach(function (e) {
        var t = e.time * sr;
        if (e.level != null) level.push({ time: t, value: +e.level });
        if (e.motion != null) motion.push({ time: t, value: +e.motion });
        if (e.hit) hits.push({ time: t, strength: e.strength != null ? +e.strength : 1, type: "hit" });
      });
    }
    (src.level || []).forEach(function (e) { level.push({ time: +e.time, value: +e.value }); });
    (src.motion || []).forEach(function (e) { motion.push({ time: +e.time, value: +e.value }); });
    (src.hits || []).forEach(function (e) {
      if (e.type && e.type !== "hit") return;
      hits.push({ time: +e.time, strength: e.strength != null ? +e.strength : 1, type: "hit" });
    });
    level.sort(byTime); hits.sort(byTime); motion.sort(byTime);
    var end = Math.max(level.length ? level[level.length - 1].time : 0, hits.length ? hits[hits.length - 1].time : 0,
      motion.length ? motion[motion.length - 1].time : 0);
    return { name: name, sampleRate: sr, level: level, hits: hits, motion: motion, duration: end / sr };
  }

  // one call for hosts: feed "level", "hits", "motion" or "motionCentred" of a normalised lane
  function laneToInput(lane, feed, startTime, dt, N, opts) {
    if (feed === "hits") return hitsToInput(lane.hits, lane.sampleRate, startTime, dt, N, opts);
    if (feed === "motion" || feed === "motionCentred") {
      var out = levelToInput(lane.motion, lane.sampleRate, startTime, dt, N, opts);
      if (feed === "motionCentred") for (var i = 0; i < N; i++) out[i] = 0.5 + 0.5 * out[i];
      return out;
    }
    return levelToInput(lane.level, lane.sampleRate, startTime, dt, N, opts);
  }

  return { levelToInput: levelToInput, hitsToInput: hitsToInput, fromTympo: fromTympo, laneToInput: laneToInput, laneNames: laneNames };
});
