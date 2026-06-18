/*
 * KINETIC TYPE — Kinetic wave (MVP)  (demos/kinetic-type/render.js)
 * Ported from tool/index.html `case "type"`. Each later glyph reads an older
 * sample of the signal, so a wave travels across the word; amplitude + glow +
 * scale follow the signal. Reads only bufX/bufY via the engine's combine().
 */
(function (root) {
  "use strict";
  var combine = root.SignalEngine.combine;

  function render(ctx, W, H, F) {
    var S = F.S, bx = F.bufX, by = F.bufY, L = bx.length;
    var txt = (S.word || "SIGNAL RACK").toString();
    var mode = S._drive || "x", amp = S.amp;
    var cx = W / 2, cy = H / 2;
    var fs = Math.max(20, Math.min(54, W / 10));
    ctx.font = "bold " + fs + "px ui-monospace,Menlo,monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var cw = fs * 0.64, x0 = cx - (txt.length - 1) * cw / 2;
    var stride = Math.max(1, Math.floor(L / (txt.length * 1.4)));
    for (var i = 0; i < txt.length; i++) {
      if (txt[i] === " ") continue;
      var idx = Math.max(0, Math.min(L - 1, L - 1 - i * stride));   // older sample → wave travels
      var v = combine(mode, bx[idx], by[idx]);
      var yoff = (v * 2 - 1) * H * 0.17 * amp, s = 0.82 + v * 0.5;
      ctx.save(); ctx.translate(x0 + i * cw, cy + yoff); ctx.scale(s, s);
      ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 10 * v;
      ctx.fillStyle = "hsl(" + (150 + v * 45) + ",85%," + (42 + v * 34) + "%)";
      ctx.fillText(txt[i], 0, 0); ctx.restore();
    }
    ctx.textBaseline = "alphabetic";
  }

  root.Demo = {
    title: "Kinetic Type — Wave",
    driver: { x: { src: "sine", rate: 1.4 }, y: { src: "sine", rate: 2, phase: 0.25 }, drive: "mult" },
    structure: [
      { tier: "structure", key: "word", label: "Word", type: "text", value: "SIGNAL RACK" }
    ],
    shaping: [
      { tier: "shaping", key: "amp", label: "Wave height", type: "slider", min: 0, max: 2, step: 0.05, value: 1, fmt: function (v) { return (+v).toFixed(2); } }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
