/*
 * FIELD DISTORT — Etheros as a distorter  (demos/field-distort/render.js)
 * -------------------------------------------------------------------------
 * The other direction. In Field Bridge a signal DRIVES a field. Here the field
 * is the instrument that DISTORTS something else: a FUI plate (reticle / grid /
 * type / rings) is warped by the Etheros field used as a displacement map —
 * the field's local gradient offsets the source pixels, the signal `n` pulses
 * the distortion amount, and an optional chroma split gives a film-burn /
 * sensor-interference look.
 *
 *   plate (FUI vector art)  ──displaced by──>  Etheros field  ──pulsed by──> signal
 *
 * CPU (etheros-lite) so the displacement field can be sampled at arbitrary
 * points for the gradient; warped at reduced res, then scaled up smoothly.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var EL = root.EtherosLite;

  // ---- the FUI plate: drawn into an offscreen buffer, then distorted --------
  function drawPlate(g, W, H, type, t, n) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#0c0c0e"; g.fillRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42;
    var amber = "#e8a838", green = "#7ec77a", dim = "rgba(232,168,56,0.35)";
    g.lineWidth = Math.max(1, W / 600);
    if (type === "grid") {
      g.strokeStyle = dim;
      var step = Math.max(18, W / 26);
      for (var x = 0; x <= W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (var y = 0; y <= H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.fillStyle = amber;
      for (var gx = 0; gx <= W; gx += step) for (var gy = 0; gy <= H; gy += step) { g.beginPath(); g.arc(gx, gy, W / 360, 0, 7); g.fill(); }
    } else if (type === "type") {
      g.fillStyle = amber; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "700 " + Math.round(R * 0.52) + "px ui-monospace, Menlo, monospace";
      g.fillText("ETHEROS", cx, cy - R * 0.18);
      g.fillStyle = green; g.font = "600 " + Math.round(R * 0.16) + "px ui-monospace, Menlo, monospace";
      g.fillText("// FIELD DISTORT", cx, cy + R * 0.34);
    } else if (type === "rings") {
      for (var i = 0; i < 7; i++) { g.strokeStyle = i % 2 ? dim : amber; g.beginPath(); g.arc(cx, cy, R * (0.2 + i * 0.12), 0, 7); g.stroke(); }
    } else { // reticle (default)
      g.strokeStyle = amber;
      g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
      g.beginPath(); g.arc(cx, cy, R * 0.62, 0, 7); g.stroke();
      g.strokeStyle = dim; g.beginPath(); g.arc(cx, cy, R * 1.18, 0, 7); g.stroke();
      // tick ring
      g.strokeStyle = amber;
      for (var a = 0; a < 72; a++) { var an = a / 72 * Math.PI * 2, rr = a % 6 ? R * 1.04 : R * 1.1; g.beginPath(); g.moveTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); g.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); g.stroke(); }
      // crosshair with gap
      g.beginPath(); g.moveTo(cx - R * 1.2, cy); g.lineTo(cx - R * 0.1, cy); g.moveTo(cx + R * 0.1, cy); g.lineTo(cx + R * 1.2, cy);
      g.moveTo(cx, cy - R * 1.2); g.lineTo(cx, cy - R * 0.1); g.moveTo(cx, cy + R * 0.1); g.lineTo(cx, cy + R * 1.2); g.stroke();
      // corner brackets
      var m = Math.min(W, H) * 0.06, p = Math.min(W, H) * 0.08;
      g.beginPath();
      [[p, p, 1, 1], [W - p, p, -1, 1], [p, H - p, 1, -1], [W - p, H - p, -1, -1]].forEach(function (b) {
        g.moveTo(b[0], b[1] + b[3] * m); g.lineTo(b[0], b[1]); g.lineTo(b[0] + b[2] * m, b[1]);
      });
      g.stroke();
      // a live readout that breathes with the signal
      g.fillStyle = green; g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.font = "600 " + Math.round(R * 0.1) + "px ui-monospace, Menlo, monospace";
      g.fillText("FIELD " + (n * 100).toFixed(0).padStart(3, "0") + "%", cx - R * 0.95, cy + R * 1.16);
      g.fillStyle = amber; g.beginPath(); g.arc(cx, cy, R * 0.04 + n * R * 0.05, 0, 7); g.fill();
    }
  }

  // offscreen buffers: plate (vector art) + out (warped result), both warp-res
  var plate = null, pctx = null, out = null, octx = null, gridV = null;
  function ensure(cols, rows) {
    if (!plate) { plate = document.createElement("canvas"); pctx = plate.getContext("2d"); out = document.createElement("canvas"); octx = out.getContext("2d"); }
    if (plate.width !== cols || plate.height !== rows) { plate.width = out.width = cols; plate.height = out.height = rows; }
  }

  function render(ctx, W, H, F) {
    var S = F.S, t = F.t * 0.5, n = Math.max(0, Math.min(1, F.n));
    var cols = Math.min(360, Math.max(120, Math.round(W / 3.2))), rows = Math.max(1, Math.round(cols * (H / W)));
    ensure(cols, rows);
    drawPlate(pctx, cols, rows, S.plate, t, n);
    var src = pctx.getImageData(0, 0, cols, rows).data;

    // displacement field — a smooth, low-octave fbm sampled on a grid (cheap),
    // then bilinearly read + differentiated per pixel for the warp vector.
    var GW = 110, GH = Math.max(2, Math.round(GW * (rows / cols))), ar = rows / cols;
    if (!gridV || gridV.length !== GW * GH) gridV = new Float32Array(GW * GH);
    var recipe = { variation: { seed: Math.round(S.seed) || 7 },
      structure: { fractalMode: S.fractal || "fbm", baseScale: S.scale, octaveCount: Math.round(S.octaves), roughness: 0.55, lacunarity: 2.0 },
      shape: { contrast: 1, thresholdLow: 0, thresholdHigh: 1, clampLow: 0, clampHigh: 1 },
      motion: { mode: "flow", evolutionRate: 0.08, flowDirection: [0.15, 1], flowStrength: S.drift }, warp: { enabled: false } };
    for (var j = 0; j < GH; j++) for (var i = 0; i < GW; i++) gridV[j * GW + i] = EL.sample(recipe, i / GW, (j / GH) * ar, t);

    function fieldAt(u, v) { // u,v in [0,1] of the grid
      var gx = u * (GW - 1), gy = v * (GH - 1);
      var ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy;
      var ix1 = ix < GW - 1 ? ix + 1 : ix, iy1 = iy < GH - 1 ? iy + 1 : iy;
      var a = gridV[iy * GW + ix], b = gridV[iy * GW + ix1], c = gridV[iy1 * GW + ix], d = gridV[iy1 * GW + ix1];
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }

    var amt = (S.amount * (0.35 + 0.65 * n)) * (cols / 60);   // signal pulses distortion
    var chroma = S.chroma * (cols / 120), heat = S.heat * (cols / 60), e = 1.5 / cols;
    var dst = octx.createImageData(cols, rows), o = dst.data, p = 0;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var u = x / cols, vv = y / rows;
      var gxv = (fieldAt(u + e, vv) - fieldAt(u - e, vv)), gyv = (fieldAt(u, vv + e) - fieldAt(u, vv - e));
      var fc = fieldAt(u, vv);
      var dx = gxv * amt, dy = gyv * amt + (fc - 0.5) * heat;
      var sx = x + dx, sy = y + dy;
      o[p] = samp(src, cols, rows, sx + chroma, sy, 0);       // R shifted +
      o[p + 1] = samp(src, cols, rows, sx, sy, 1);            // G centered
      o[p + 2] = samp(src, cols, rows, sx - chroma, sy, 2);   // B shifted −
      o[p + 3] = 255; p += 4;
    }
    octx.putImageData(dst, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(out, 0, 0, cols, rows, 0, 0, W, H);
  }
  function samp(data, W, H, x, y, ch) {
    var ix = x < 0 ? 0 : x > W - 1 ? W - 1 : x | 0, iy = y < 0 ? 0 : y > H - 1 ? H - 1 : y | 0;
    return data[(iy * W + ix) * 4 + ch];
  }

  var f2 = function (v) { return (+v).toFixed(2); };
  root.Demo = {
    title: "Field Distort",
    driver: { x: { src: "sine", rate: 0.5 }, drive: "x" },
    structure: [
      { tier: "structure", key: "plate", label: "Plate", type: "select", value: "reticle", options: [
        { value: "reticle", label: "Reticle" }, { value: "grid", label: "Grid" }, { value: "type", label: "Type" }, { value: "rings", label: "Rings" } ] },
      { tier: "structure", key: "fractal", label: "Field", type: "select", value: "fbm", options: [
        { value: "fbm", label: "fBm (smooth)" }, { value: "ridged", label: "Ridged" }, { value: "turbulence", label: "Turbulence" } ] },
      { tier: "structure", key: "scale", label: "Field scale", type: "slider", min: 1, max: 7, step: 0.2, value: 2.6, fmt: f2 },
      { tier: "structure", key: "octaves", label: "Octaves", type: "slider", min: 1, max: 5, step: 1, value: 3 },
      { tier: "structure", key: "seed", label: "Seed", type: "slider", min: 1, max: 999, step: 1, value: 7 }
    ],
    shaping: [
      { tier: "shaping", key: "amount", label: "Distort amount", type: "slider", min: 0, max: 3, step: 0.05, value: 1, fmt: f2 },
      { tier: "shaping", key: "chroma", label: "Chroma split", type: "slider", min: 0, max: 6, step: 0.2, value: 1.2, fmt: f2 },
      { tier: "shaping", key: "heat", label: "Heat rise", type: "slider", min: 0, max: 3, step: 0.1, value: 0.6, fmt: f2 },
      { tier: "shaping", key: "drift", label: "Field drift", type: "slider", min: 0, max: 0.8, step: 0.02, value: 0.25, fmt: f2 }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
