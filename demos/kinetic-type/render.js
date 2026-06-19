/*
 * KINETIC TYPE — wave / pump / glitch / shake  (demos/kinetic-type/render.js)
 * -------------------------------------------------------------------------
 * Signal-driven type. A variant picker switches between ports of tool's
 * type / textPump / textGlitch / textShake. Reads n + bufX/bufY (via the
 * engine's combine()). Word is editable; the shaping amount scales the effect.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var combine = root.SignalEngine.combine, Shaping = root.SignalShaping, Easing = root.Easing, Proj3 = root.Proj3;
  // auxiliary engine drivers — independent signals for Z and rotation (multi-signal)
  var zDrv = root.SignalEngine.create({ x: { src: "sine", rate: 0.6 } });
  var rotDrv = root.SignalEngine.create({ x: { src: "triangle", rate: 0.4 } });
  var prog3 = 0, last3 = null;

  function wave(ctx, W, H, F, txt, amp, mode) {
    var cx = W / 2, cy = H / 2;
    var fs = Math.max(20, Math.min(54, W / 10));
    ctx.font = "bold " + fs + "px ui-monospace,Menlo,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var cw = fs * 0.64, x0 = cx - (txt.length - 1) * cw / 2;
    for (var i = 0; i < txt.length; i++) {
      if (txt[i] === " ") continue;
      var v = Shaping.fieldValue(F, i, txt.length);   // field map across the letters
      var yoff = (v * 2 - 1) * H * 0.17 * amp, s = 0.82 + v * 0.5;
      ctx.save(); ctx.translate(x0 + i * cw, cy + yoff); ctx.scale(s, s);
      ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 10 * v; ctx.fillStyle = "hsl(" + (150 + v * 45) + ",85%," + (42 + v * 34) + "%)";
      ctx.fillText(txt[i], 0, 0); ctx.restore();
    }
    ctx.textBaseline = "alphabetic";
  }
  function pump(ctx, W, H, F, txt, amp) {
    var e = Math.max(0, Math.min(1, F.n)), cx = W / 2, cy = H / 2;
    var fs = Math.max(26, Math.min(96, W / 7)) * (0.78 + e * 0.5 * amp);
    ctx.font = "900 " + fs + "px ui-monospace,Menlo,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.32 + e * 0.68; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8 + e * 44;
    ctx.fillStyle = "hsl(" + (150 + e * 60) + ",85%," + (50 + e * 22) + "%)"; ctx.fillText(txt, cx, cy);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.textBaseline = "alphabetic";
  }
  function glitch(ctx, W, H, F, txt, amp, mode) {
    var bx = F.bufX, by = F.bufY, L = bx.length, n = F.n, e = Math.max(0, Math.min(1, n)), cx = W / 2, cy = H / 2;
    var fs = Math.max(22, Math.min(64, W / 8)); ctx.font = "900 " + fs + "px ui-monospace,Menlo,monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var ox = (n * 2 - 1) * (4 + e * 18) * amp, oy = (combine(mode, by[L >> 1], bx[L >> 1]) * 2 - 1) * e * 5 * amp;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.85; ctx.fillStyle = "#ff2d4d"; ctx.fillText(txt, cx - ox, cy - oy);
    ctx.fillStyle = "#2dd4ff"; ctx.fillText(txt, cx + ox, cy + oy);
    ctx.globalAlpha = 0.95; ctx.fillStyle = "#eaf6f5"; ctx.fillText(txt, cx, cy);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic";
  }
  function shake(ctx, W, H, F, txt, amp) {
    var e = Math.max(0, Math.min(1, F.n)), cx = W / 2, cy = H / 2;
    var a = e * e * 22 * amp, dx = (Math.random() - 0.5) * a, dy = (Math.random() - 0.5) * a, fs = Math.round(Math.min(W, H) * 0.16 * (0.9 + e * 0.3));
    ctx.font = "900 " + fs + "px ui-monospace,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (e > 0.6) { ctx.globalAlpha = 0.5; ctx.fillStyle = "#ff2d4d"; ctx.fillText(txt, cx + dx - a * 0.3, cy + dy); ctx.fillStyle = "#2dd4ff"; ctx.fillText(txt, cx + dx + a * 0.3, cy + dy); ctx.globalAlpha = 1; }
    ctx.fillStyle = "#eaf6f5"; ctx.fillText(txt, cx + dx, cy + dy); ctx.textBaseline = "alphabetic";
  }

  // Cascade — per-letter reveal in reading order, timed by the easing driver
  // (looping playhead). Surfaces Easing; signal lifts the entrance height.
  function cascade(ctx, W, H, F, txt, amp) {
    var t = F.t, e = Math.max(0, Math.min(1, F.n)), cx = W / 2, cy = H / 2, ease = F.S.ease || "out", p = (t * 0.4) % 1.4;
    var fs = Math.max(22, Math.min(58, W / 9));
    ctx.font = "800 " + fs + "px ui-monospace,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var cw = fs * 0.62, x0 = cx - (txt.length - 1) * cw / 2;
    for (var i = 0; i < txt.length; i++) {
      if (txt[i] === " ") continue;
      var lp = i / Math.max(1, txt.length - 1), local = Math.max(0, Math.min(1, (p - lp * 0.6) / 0.4)), pr = Easing.apply(ease, local);
      ctx.globalAlpha = pr; ctx.fillStyle = "#36f09a"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 10 * pr;
      ctx.fillText(txt[i], x0 + i * cw, cy + (1 - pr) * fs * 0.9 * (0.5 + e * amp));
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.textBaseline = "alphabetic";
  }

  // 3D multi-signal — THREE independent signals drive one title:
  //   A (host driver)  → per-letter transition-in (reveal playhead, signal-paced)
  //   B (zDrv)         → Z fly-in position (per-letter, staggered)
  //   C (rotDrv)       → per-character rotation
  // Composited through proj3. The clearest demonstration of multi-output routing.
  function text3d(ctx, W, H, F, txt) {
    var S = F.S, t = F.t, cx = W / 2, cy = H / 2, e = Math.max(0, Math.min(1, F.n));
    var dt = last3 == null ? 0 : Math.max(0, Math.min(0.1, t - last3)); last3 = t;
    prog3 += dt * (0.12 + e * (S.pace != null ? S.pace : 0.6) * 1.4); if (prog3 >= 1.6) prog3 = 0;
    zDrv.set({ x: { rate: S.zrate != null ? S.zrate : 0.6 } });
    rotDrv.set({ x: { rate: S.rotrate != null ? S.rotrate : 0.4 } });
    var fs = Math.max(28, Math.min(84, W / 8)); ctx.font = "800 " + fs + "px ui-monospace,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var R = Math.min(W, H) * 0.42, cam = { yaw: 0, pitch: 0, dist: 3.6 }, n = txt.length, spanXn = (n - 1) * (fs * 0.72) / R;
    for (var i = 0; i < n; i++) {
      if (txt[i] === " ") continue; var lp = i / Math.max(1, n - 1);
      var reveal = Easing.apply("out", Math.max(0, Math.min(1, (prog3 - lp * 0.55) / 0.45)));   // signal A
      var zsig = zDrv.sample(t - i * 0.12).n;                                                    // signal B
      var rot = (rotDrv.sample(t - i * 0.15).n * 2 - 1) * Math.PI * (S.rotamt != null ? S.rotamt : 0.5); // signal C
      var z = (1 - reveal) * -3.2 + (zsig * 2 - 1) * (S.zamt != null ? S.zamt : 1.2);
      var pr = Proj3.project({ x: (lp - 0.5) * spanXn, y: 0, z: z }, cam), sc = Math.max(0.05, pr.scale);
      ctx.save(); ctx.translate(cx + pr.x * R, cy + pr.y * R); ctx.rotate(rot); ctx.scale(sc, sc);
      ctx.globalAlpha = Math.max(0, Math.min(1, reveal)); ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 12 * reveal;
      ctx.fillStyle = "hsl(" + (150 + zsig * 70) + ",85%," + (45 + zsig * 25) + "%)"; ctx.fillText(txt[i], 0, 0); ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.textBaseline = "alphabetic";
  }

  function render(ctx, W, H, F) {
    var S = F.S, txt = (S.word || "SIGNAL RACK").toString(), amp = S.amp, mode = S._drive || "x";
    switch (S.variant) {
      case "pump":    pump(ctx, W, H, F, txt, amp); break;
      case "glitch":  glitch(ctx, W, H, F, txt, amp, mode); break;
      case "shake":   shake(ctx, W, H, F, txt, amp); break;
      case "cascade": cascade(ctx, W, H, F, txt, amp); break;
      case "text3d":  text3d(ctx, W, H, F, txt); break;
      default:        wave(ctx, W, H, F, txt, amp, mode);
    }
  }

  root.Demo = {
    title: "Kinetic Type",
    driver: { x: { src: "sine", rate: 1.4 }, y: { src: "sine", rate: 2, phase: 0.25 }, drive: "mult" },
    structure: [
      { tier: "structure", key: "variant", label: "Variant", type: "select", value: "wave", options: [
        { value: "wave", label: "Kinetic wave" }, { value: "pump", label: "Title pump" }, { value: "glitch", label: "RGB glitch" }, { value: "shake", label: "Shake / impact" }, { value: "cascade", label: "Cascade reveal" }, { value: "text3d", label: "3D multi-signal" } ] },
      { tier: "structure", key: "word", label: "Word", type: "text", value: "SIGNAL RACK" }
    ],
    shaping: [
      root.SignalShaping.fieldSpec("sweep"),
      { tier: "shaping", key: "amp", label: "Amount", type: "slider", min: 0, max: 2, step: 0.05, value: 1, fmt: function (v) { return (+v).toFixed(2); } },
      { tier: "shaping", key: "ease", label: "Easing <span>(cascade)</span>", type: "select", value: "out", options: root.Easing.OPTIONS, when: { variant: "cascade" } },
      // multi-signal 3D routing (signal A = host driver; B/C below)
      { tier: "shaping", key: "pace",    label: "A · transition pace", type: "slider", min: 0, max: 1, step: 0.01, value: 0.6, fmt: function (v) { return (+v).toFixed(2); }, when: { variant: "text3d" } },
      { tier: "shaping", key: "zrate",   label: "B · Z signal rate", type: "slider", min: 0.1, max: 3, step: 0.1, value: 0.6, fmt: function (v) { return (+v).toFixed(1); }, when: { variant: "text3d" } },
      { tier: "shaping", key: "zamt",    label: "B · Z fly amount", type: "slider", min: 0, max: 3, step: 0.1, value: 1.2, fmt: function (v) { return (+v).toFixed(1); }, when: { variant: "text3d" } },
      { tier: "shaping", key: "rotrate", label: "C · rotate signal rate", type: "slider", min: 0.1, max: 3, step: 0.1, value: 0.4, fmt: function (v) { return (+v).toFixed(1); }, when: { variant: "text3d" } },
      { tier: "shaping", key: "rotamt",  label: "C · rotate amount", type: "slider", min: 0, max: 1, step: 0.02, value: 0.5, fmt: function (v) { return (+v).toFixed(2); }, when: { variant: "text3d" } }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
