/*
 * SIGNAL RACK — demo host  (demos/shared/host.js)
 * -------------------------------------------------------------------------
 * Boots a demo: wires the shared driver (signal-engine.js) to the schema-driven
 * control panel (controls.js) and runs the render loop. A demo is just a render
 * function plus control specs and presets — no boilerplate.
 *
 *   SignalHost.boot({
 *     title, mount,                       // string, DOM id (default "app")
 *     driver: { x, y, drive, proc, span },// initial driver config
 *     structure: [ ...control specs ],    // tier:"structure"
 *     shaping:   [ ...control specs ],    // tier:"shaping"
 *     signal:    [ ...control specs ],    // optional; defaults provided
 *     presets:   { Name: { driver, S } }, // optional
 *     render(ctx, W, H, frame)            // frame = { t, n, x, y, bufX, bufY, S }
 *   })
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./signal-engine"), require("./controls"));
  else root.SignalHost = factory(root.SignalEngine, root.SignalControls);
})(typeof self !== "undefined" ? self : this, function (SignalEngine, SignalControls) {
  "use strict";

  var SRC_OPTS = [
    { value: "sine", label: "Sine" }, { value: "triangle", label: "Triangle" },
    { value: "pulse", label: "Pulse" }, { value: "saw", label: "Ramp / Saw" },
    { value: "noise", label: "Noise" }, { value: "randomWalk", label: "Random walk" }
  ];
  var DRIVE_OPTS = [
    { value: "x", label: "Channel X" }, { value: "mult", label: "X × Y (ring)" },
    { value: "mix", label: "(X + Y) / 2" }, { value: "diff", label: "|X − Y|" },
    { value: "min", label: "min(X, Y)" }, { value: "max", label: "max(X, Y)" }
  ];

  function defaultSignalSpecs(d) {
    return [
      { tier: "signal", key: "_src",   label: "Source",     type: "select", value: srcName(d.x.src), options: SRC_OPTS },
      { tier: "signal", key: "_rate",  label: "Rate <span>Hz</span>", type: "slider", min: 0.1, max: 6, step: 0.1, value: d.x.rate, fmt: function (v) { return (+v).toFixed(1); } },
      { tier: "signal", key: "_drive", label: "Combine",    type: "select", value: d.drive, options: DRIVE_OPTS },
      { tier: "signal", key: "_speed", label: "Speed",      type: "slider", min: 0.1, max: 3, step: 0.1, value: 1, fmt: function (v) { return (+v).toFixed(1) + "×"; } }
    ];
  }
  var SRCNAMES = { 1: "sine", 2: "square", 3: "saw", 4: "noise", 5: "randomWalk", 8: "triangle", 9: "pulse" };
  function srcName(v) { return typeof v === "string" ? v : (SRCNAMES[v] || "sine"); }

  function boot(cfg) {
    var driver = SignalEngine.create(cfg.driver || {});
    var mount = document.getElementById(cfg.mount || "app");

    // layout
    var app = div("sh-app");
    var stage = div("sh-stage");
    var bar = div("sh-topbar");
    var title = div("sh-title"); title.textContent = cfg.title || "Signal Demo";
    var badge = div("sh-badge live"); badge.textContent = "engine: CPU parity";
    var spacer = div("sh-spacer");
    var bLink = btn("Copy link"), bExport = btn("Export JSON"), bSurprise = btn("🎲");
    bar.append(title, badge, spacer, bSurprise, bLink, bExport);
    var wrap = div("sh-canvas-wrap");
    var canvas = document.createElement("canvas"); canvas.className = "sh-canvas";
    wrap.appendChild(canvas);
    stage.append(bar, wrap);
    var panel = div("sh-panel");
    app.append(stage, panel);
    mount.innerHTML = ""; mount.appendChild(app);

    // controls
    var specs = (cfg.structure || [])
      .concat(cfg.signal || defaultSignalSpecs(driver))
      .concat(cfg.shaping || []);
    var ui = SignalControls.build(panel, specs, onChange);
    var speed = 1;

    function applySignal(s) {
      var patch = {};
      if ("_src" in s) patch.x = { src: s._src };
      if ("_rate" in s) { patch.x = Object.assign(patch.x || {}, { rate: +s._rate }); }
      if ("_drive" in s) patch.drive = s._drive;
      if (Object.keys(patch).length) driver.set(patch);
      if ("_speed" in s) speed = +s._speed;
    }
    function onChange(s) { applySignal(s); pushHash(); }
    applySignal(ui.state);

    // canvas sizing
    var ctx = canvas.getContext("2d"), W = 0, H = 0;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener("resize", resize); resize();

    // render loop
    var t0 = performance.now();
    function frame() {
      var t = (performance.now() - t0) / 1000 * speed;
      var w = driver.window(t, 512);
      ctx.clearRect(0, 0, W, H);
      try {
        cfg.render(ctx, W, H, { t: t, n: w.n, x: w.bufX[511], y: w.bufY[511],
          bufX: w.bufX, bufY: w.bufY, S: ui.state });
      } catch (e) { badge.textContent = "render error: " + e.message; badge.classList.remove("live"); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // persistence
    function snapshot() { return { S: ui.state, driver: { x: driver.x, y: driver.y, drive: driver.drive } }; }
    function pushHash() {
      try { location.replace("#" + btoa(unescape(encodeURIComponent(JSON.stringify(snapshot()))))); } catch (e) {}
    }
    function loadHash() {
      if (!location.hash || location.hash.length < 2) return;
      try {
        var obj = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1)))));
        if (obj.S) for (var k in obj.S) if (ui.refs[k]) ui.set(k, obj.S[k]);
      } catch (e) {}
    }
    bLink.onclick = function () { pushHash(); navigator.clipboard && navigator.clipboard.writeText(location.href); bLink.textContent = "Copied!"; setTimeout(function () { bLink.textContent = "Copy link"; }, 1200); };
    bExport.onclick = function () {
      var blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = (cfg.title || "demo").toLowerCase().replace(/\s+/g, "-") + ".json"; a.click();
    };
    bSurprise.onclick = function () {
      if (cfg.presets) { var ks = Object.keys(cfg.presets); applyPreset(cfg.presets[ks[(Math.random() * ks.length) | 0]]); }
      else { ui.set("_src", SRC_OPTS[(Math.random() * SRC_OPTS.length) | 0].value); ui.set("_rate", (0.5 + Math.random() * 4).toFixed(1)); }
    };
    function applyPreset(p) {
      if (!p) return;
      if (p.driver) driver.set(p.driver);
      if (p.S) for (var k in p.S) if (ui.refs[k]) ui.set(k, p.S[k]);
    }

    loadHash();
    return { driver: driver, ui: ui, applyPreset: applyPreset };
  }

  function div(cls) { var e = document.createElement("div"); e.className = cls; return e; }
  function btn(label) { var b = document.createElement("button"); b.className = "sh-btn"; b.textContent = label; return b; }

  return { boot: boot, SRC_OPTS: SRC_OPTS, DRIVE_OPTS: DRIVE_OPTS };
});
