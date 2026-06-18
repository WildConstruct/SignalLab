/*
 * SIGNAL RACK — shared control-panel kit  (demos/shared/controls.js)
 * -------------------------------------------------------------------------
 * Schema-driven three-tier panel (Structure / Signal / Shaping) so every demo
 * gets the same UX for free. A demo declares an array of control specs; this
 * builds the DOM, owns a live `state` object, and calls back on change.
 *
 *   spec = { tier:"structure"|"signal"|"shaping", key, label,
 *            type:"slider"|"select"|"toggle"|"text",
 *            min, max, step, value, options:[{value,label}], fmt }
 *
 *   SignalControls.build(mountEl, specs, onChange) -> { state, set, refresh }
 *
 * `state` maps key -> current value. `onChange(state, key)` fires on every edit.
 * Double-clicking a slider resets it to its declared default.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SignalControls = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TIERS = [
    { key: "structure", title: "Structure", hint: "the instrument's static identity" },
    { key: "signal",    title: "Signal",    hint: "the driver in the background" },
    { key: "shaping",   title: "Shaping",   hint: "how the signal subtly maps in" }
  ];

  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function build(mount, specs, onChange) {
    var state = {}, refs = {};
    onChange = onChange || function () {};

    TIERS.forEach(function (tier) {
      var inTier = specs.filter(function (s) { return (s.tier || "shaping") === tier.key; });
      if (!inTier.length) return;
      var sec = el("div", "sh-section");
      var h = el("h3"); h.textContent = tier.title;
      var hint = el("span", "sh-hint"); hint.textContent = tier.hint; h.appendChild(hint);
      sec.appendChild(h);
      inTier.forEach(function (s) { sec.appendChild(ctl(s)); });
      mount.appendChild(sec);
    });

    function ctl(s) {
      state[s.key] = s.value;
      var fmt = s.fmt || function (v) { return v; };

      if (s.type === "select") {
        var wrap = el("div", "sh-ctl");
        var lab = el("label"); lab.innerHTML = s.label; wrap.appendChild(lab);
        var sel = el("select");
        (s.options || []).forEach(function (o) {
          var opt = el("option"); opt.value = o.value; opt.textContent = o.label;
          if (o.value === s.value) opt.selected = true; sel.appendChild(opt);
        });
        sel.onchange = function () { state[s.key] = sel.value; onChange(state, s.key); };
        wrap.appendChild(sel); refs[s.key] = sel; return wrap;
      }

      if (s.type === "toggle") {
        var rw = el("div", "sh-ctl row");
        var cb = el("input", null, { type: "checkbox" }); cb.checked = !!s.value;
        var l2 = el("label"); l2.innerHTML = s.label;
        cb.onchange = function () { state[s.key] = cb.checked; onChange(state, s.key); };
        rw.appendChild(cb); rw.appendChild(l2); refs[s.key] = cb; return rw;
      }

      if (s.type === "text") {
        var tw = el("div", "sh-ctl");
        var tl = el("label"); tl.innerHTML = s.label; tw.appendChild(tl);
        var tx = el("input", null, { type: "text" }); tx.value = s.value;
        tx.oninput = function () { state[s.key] = tx.value; onChange(state, s.key); };
        tw.appendChild(tx); refs[s.key] = tx; return tw;
      }

      // slider (default)
      var w = el("div", "sh-ctl");
      var lab2 = el("label");
      var name = el("span"); name.innerHTML = s.label;
      var val = el("b"); val.textContent = fmt(s.value);
      lab2.appendChild(name); lab2.appendChild(val); w.appendChild(lab2);
      var r = el("input", null, { type: "range", min: s.min, max: s.max,
        step: s.step != null ? s.step : 1 });
      r.value = s.value;
      r.oninput = function () { var v = +r.value; state[s.key] = v; val.textContent = fmt(v); onChange(state, s.key); };
      r.ondblclick = function () { r.value = s.value; r.oninput(); };   // reset to default
      w.appendChild(r); refs[s.key] = r; return w;
    }

    function set(key, v) {
      state[key] = v;
      var r = refs[key];
      if (!r) return;
      if (r.type === "checkbox") r.checked = !!v; else r.value = v;
      if (r.oninput) r.oninput();
    }
    function refresh() { for (var k in refs) { var r = refs[k]; if (r && r.tagName === "INPUT" && r.type === "range" && r.oninput) r.oninput(); } }

    return { state: state, set: set, refresh: refresh, refs: refs };
  }

  return { build: build, TIERS: TIERS };
});
