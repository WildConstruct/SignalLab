/*
 * FUI KIT — Synapse · Data packets · Processor die · Equalizer · Radar
 * (demos/fui-kit/render.js)
 * -------------------------------------------------------------------------
 * HUD widgets where the signal in the background decides WHICH elements fire and
 * in what sequence. A Widget picker switches modes; each mode shows its OWN
 * structure controls (the panel is conditional via `when`). Renderers read only
 * n / bufX / bufY (via the shared driver + field map); seed reshapes structure,
 * `Fire ≥` is the shared threshold. No signal math here — uses combine().
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var combine = root.SignalEngine.combine, Shaping = root.SignalShaping, FUI = root.FUI;

  function synapse(ctx, W, H, F) {
    var S = F.S, t = F.t;
    var cx = W / 2, cy = H / 2, seed = (+S.seed || 1) * 0.137;
    function hx(k) { var s = Math.sin(k * 127.1 + 311.7 + seed) * 43758.5453; return s - Math.floor(s); }
    var NODES = Math.max(3, Math.round(S.nodes)), deg0 = Math.max(1, Math.round(S.connect)), fire = S.fire;
    var prop = S.propag != null ? S.propag : 0.6, seqAmt = S.seq || 0;
    var pos = [];
    for (var i = 0; i < NODES; i++) pos.push([cx + (hx(i) - 0.5) * Math.min(W * 0.84, 820), cy + (hx(i + 50) - 0.5) * Math.min(H * 0.74, 440)]);
    function seqEnv(i) { return seqAmt <= 0 ? 1 : (1 - seqAmt) + seqAmt * (0.5 + 0.5 * Math.sin(t * prop * 3 - i * 1.1)); }
    function act(i) { return Math.max(0, Math.min(1, Shaping.fieldValue(F, i, NODES, Math.round(+S.seed || 0) + 9) * seqEnv(i))); }
    var edges = [];
    for (i = 0; i < NODES; i++) for (var d = 0; d < deg0; d++) { var j = Math.floor(hx(i * 5 + d + 617) * NODES); if (j === i) j = (j + 1) % NODES; edges.push([i, j]); }
    for (var ei = 0; ei < edges.length; ei++) {
      var a = edges[ei][0], b = edges[ei][1], A = pos[a], B = pos[b];
      ctx.strokeStyle = "#15303a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      var aa = act(a);
      if (aa > Math.max(0.05, fire - 0.1)) { var ph = (t * prop + hx(ei * 3)) % 1, x = A[0] + (B[0] - A[0]) * ph, y = A[1] + (B[1] - A[1]) * ph;
        ctx.globalAlpha = aa; ctx.fillStyle = "#7df0c2"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x, y, 2 + aa * 2, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; }
    }
    for (i = 0; i < NODES; i++) {
      var av = act(i), P = pos[i], fired = av > fire;
      ctx.fillStyle = fired ? "hsl(" + (150 + av * 120) + ",90%," + (55 + av * 20) + "%)" : "#1b2a30";
      ctx.shadowColor = "#36f09a"; ctx.shadowBlur = fired ? 14 * av : 0;
      ctx.beginPath(); ctx.arc(P[0], P[1], 4 + av * 8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      if (fired) { var rp = (t * 1.5 + i) % 1; ctx.strokeStyle = "rgba(54,240,154," + (av * (1 - rp)) + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P[0], P[1], 8 + 24 * rp, 0, 7); ctx.stroke(); }
    }
  }

  // Reworked: per-lane activity via the field map; packet COUNT scales with how
  // far the lane is above the Fire threshold × Density, hard-capped, so it stays
  // legible instead of saturating.
  function packets(ctx, W, H, F) {
    var S = F.S, cy = H / 2, e = Math.max(0, Math.min(1, F.n)), t = F.t, seed = Math.round(+S.seed || 0), fire = S.fire;
    var lanes = Math.max(2, Math.round(S.lanes)), dens = S.density != null ? S.density : 0.5;
    var span = Math.min(H * 0.82, 480), laneH = span / lanes, y0 = cy - span / 2;
    ctx.font = "11px ui-monospace,monospace"; ctx.textBaseline = "middle";
    for (var Ln = 0; Ln < lanes; Ln++) {
      var ly = y0 + laneH * (Ln + 0.5);
      var v = Shaping.fieldValue(F, Ln, lanes, seed * 7 + 3);
      ctx.strokeStyle = "#11242b"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(64, ly); ctx.lineTo(W - 30, ly); ctx.stroke();
      var hot = v > fire;
      ctx.fillStyle = hot ? "#7df0c2" : "#2a4a44"; ctx.textAlign = "right";
      ctx.fillText("0x" + (((Ln * 16 + seed * 16) & 255).toString(16).toUpperCase().padStart(2, "0")), 56, ly);
      if (!hot) continue;
      var over = (v - fire) / (1 - fire + 1e-6);                 // 0..1 above threshold
      var count = Math.min(5, Math.round(over * dens * 6));       // density-scaled, capped
      if (count < 1) continue;
      var speed = 0.04 + (Ln % 3) * 0.012 + e * 0.05;            // calmer than before
      for (var k = 0; k < count; k++) {
        var ph = ((t * speed + Ln * 0.13 + k / count) % 1), x = 64 + ph * (W - 94), pw = 10 + v * 8;
        ctx.fillStyle = "#7df0c2"; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8;
        ctx.fillRect(x - pw / 2, ly - 3, pw, 6); ctx.shadowBlur = 0;
      }
    }
    ctx.textBaseline = "alphabetic";
  }

  // Processor die — fixed-size SQUARE cells; Columns/Rows grow the grid extent
  // (a designer sizes the artwork by cell count). Only scales down uniformly if
  // the grid would overflow the canvas, so the aspect never distorts.
  function core(ctx, W, H, F) {
    var S = F.S, bx = F.bufX, L = bx.length, t = F.t;
    var cx = W / 2, cy = H / 2, seed = Math.round(+S.seed || 0), fire = S.fire;
    var cols = Math.max(2, Math.round(S.cols)), rows = Math.max(2, Math.round(S.rows));
    var cell0 = S.cell != null ? S.cell : 36, gap0 = Math.max(2, Math.round(cell0 * 0.12));
    var gridW = cols * cell0 + (cols - 1) * gap0, gridH = rows * cell0 + (rows - 1) * gap0;
    var fit = Math.min(1, (W * 0.92) / gridW, (H * 0.86) / gridH);   // shrink-to-fit only, uniform → square preserved
    var cell = cell0 * fit, g = gap0 * fit, m = 6 * fit;
    var total = cols * cell + (cols - 1) * g, gh = rows * cell + (rows - 1) * g, x0 = cx - total / 2, y0 = cy - gh / 2;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var i = r * cols + c, v = Math.max(0, Math.min(1, bx[(i * 37 + seed * 13) % L] * (0.6 + 0.4 * Math.sin(t * 3 + i + seed)))), on = v > fire;
      ctx.fillStyle = on ? "hsl(" + (150 + v * 120) + ",85%," + (28 + v * 42) + "%)" : "#0e1a1f";
      if (on) { ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 10 * v; }
      ctx.fillRect(x0 + c * (cell + g), y0 + r * (cell + g), cell, cell); ctx.shadowBlur = 0;
    }
    ctx.strokeStyle = "#1f5e4e"; ctx.lineWidth = 1.5; ctx.strokeRect(x0 - m, y0 - m, total + 2 * m, gh + 2 * m);
  }

  // fixed-width bars; Bands grows the total width (shrinks uniformly only to fit)
  function equalizer(ctx, W, H, F) {
    var S = F.S, cx = W / 2, cy = H / 2, bands = Math.max(4, Math.round(S.bands)), fire = S.fire;
    var bw0 = S.barw != null ? S.barw : 18, gap0 = Math.max(2, Math.round(bw0 * 0.33));
    var gridW = bands * bw0 + (bands - 1) * gap0, fit = Math.min(1, (W * 0.9) / gridW);
    var bw = bw0 * fit, gap = gap0 * fit, total = bands * bw + (bands - 1) * gap, x0 = cx - total / 2;
    var baseY = cy + Math.min(H * 0.32, 220), maxH = Math.min(H * 0.55, 320);
    for (var b = 0; b < bands; b++) {
      var v = Shaping.fieldValue(F, b, bands, Math.round(+S.seed || 0));
      var h = maxH * v, lit = v > fire;
      ctx.fillStyle = lit ? "hsl(" + (150 + v * 120) + ",85%," + (45 + v * 25) + "%)" : "#16242c";
      if (lit) { ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8 * v; }
      ctx.fillRect(x0 + b * (bw + gap), baseY - h, bw, h); ctx.shadowBlur = 0;
      ctx.fillStyle = "#0e1a1f"; ctx.fillRect(x0 + b * (bw + gap), baseY - h, bw, 2);
    }
    ctx.strokeStyle = "#11242b"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, baseY); ctx.lineTo(x0 + total, baseY); ctx.stroke();
  }

  // Radar — sweep-latched contacts: a blip refreshes only when the sweep line
  // crosses its bearing (sampling the signal at that instant), then fades over
  // one revolution. The set of dots is sampled AS the sweep goes around.
  var radarS = { n: 0, val: [], rng: [], at: [], prev: 0 };
  function radar(ctx, W, H, F) {
    var S = F.S, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.4, fire = S.fire, speed = S.sweep != null ? S.sweep : 0.8, t = F.t, seed = Math.round(+S.seed || 0);
    var blips = Math.max(4, Math.round(S.blips)), TAU = Math.PI * 2;
    if (radarS.n !== blips) { radarS.n = blips; radarS.val = []; radarS.rng = []; radarS.at = []; for (var z = 0; z < blips; z++) { radarS.val.push(0); radarS.rng.push(0); radarS.at.push(-1e9); } radarS.prev = 0; }
    // rings + crosshair
    ctx.strokeStyle = "#16323f"; ctx.lineWidth = 1;
    for (var r = R; r > R / 4 - 1; r -= R / 4) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    var sweep = (t * speed) % TAU;
    // latch: any bearing the sweep crossed since last frame samples the signal now
    var s0 = radarS.prev, fwd = ((sweep - s0) % TAU + TAU) % TAU;
    if (fwd > 0) for (var i = 0; i < blips; i++) {
      var b = i / blips * TAU, db = ((b - s0) % TAU + TAU) % TAU;
      if (db <= fwd) { var v = Shaping.fieldValue(F, i, blips, seed);
        if (v > fire) { radarS.val[i] = v; radarS.rng[i] = R * (0.18 + 0.8 * v); radarS.at[i] = t; } else radarS.val[i] = 0; }
    }
    radarS.prev = sweep;
    // sweep arm + trailing afterglow wedge
    for (var k = 1; k <= 6; k++) { ctx.globalAlpha = 0.06 * (7 - k); var aa = sweep - k * 0.12;
      ctx.strokeStyle = FUI.GLOW; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(aa) * R, cy + Math.sin(aa) * R); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = FUI.GLOW; ctx.lineWidth = 2; ctx.shadowColor = FUI.GLOW; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R); ctx.stroke(); ctx.shadowBlur = 0;
    // contacts: fade over one revolution since last refresh; ping ring on fresh contact
    var revT = TAU / Math.max(0.0001, speed);
    for (var j = 0; j < blips; j++) {
      var vv = radarS.val[j]; if (vv <= 0) continue;
      var age = t - radarS.at[j], inten = vv * Math.max(0, 1 - age / revT); if (inten <= 0.01) continue;
      var ang = j / blips * TAU, px = cx + Math.cos(ang) * radarS.rng[j], py = cy + Math.sin(ang) * radarS.rng[j];
      ctx.globalAlpha = 0.2 + 0.8 * inten; ctx.fillStyle = "hsl(" + (150 + vv * 120) + ",85%,60%)"; ctx.shadowColor = FUI.GLOW; ctx.shadowBlur = 10 * inten;
      ctx.beginPath(); ctx.arc(px, py, 2 + vv * 4, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      var pingT = revT * 0.18; if (age < pingT) { ctx.globalAlpha = (1 - age / pingT) * 0.5; ctx.strokeStyle = "#7df0c2"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, py, 4 + (age / pingT) * 16, 0, 7); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }

  // Telemetry Stack — labeled horizontal bar-gauges (a status/readout panel).
  // Fixed row height; Lines grows the stack (designer sizes by count).
  function telemetry(ctx, W, H, F) {
    var S = F.S, cx = W / 2, cy = H / 2, seed = Math.round(+S.seed || 0), fire = S.fire;
    var lines = Math.max(2, Math.round(S.lines)), rh0 = S.lineh != null ? S.lineh : 30, gap0 = Math.max(3, Math.round(rh0 * 0.3));
    var stackH = lines * rh0 + (lines - 1) * gap0, fit = Math.min(1, (H * 0.86) / stackH);
    var rh = rh0 * fit, gap = gap0 * fit, totalH = lines * rh + (lines - 1) * gap;
    var panelW = Math.min(W * 0.72, 560), x0 = cx - panelW / 2, y0 = cy - totalH / 2;
    var labW = 50, valW = 56, bx0 = x0 + labW, bw = panelW - labW - valW;
    ctx.font = Math.max(9, Math.min(13, rh * 0.46)) + "px ui-monospace,monospace"; ctx.textBaseline = "middle";
    for (var i = 0; i < lines; i++) {
      var y = y0 + i * (rh + gap), v = Shaping.fieldValue(F, i, lines, seed * 5 + 1), hot = v > fire;
      var bh = rh * 0.62, by = y + (rh - bh) / 2;
      ctx.fillStyle = hot ? "#e8a838" : "#6a6a70"; ctx.textAlign = "left";
      ctx.fillText("CH" + (i < 10 ? "0" : "") + i, x0, y + rh / 2);
      ctx.fillStyle = "#141418"; ctx.fillRect(bx0, by, bw, bh);                     // track
      ctx.fillStyle = hot ? "#e0683a" : "#7ec77a";                                  // fill (alert past Fire)
      if (hot) { ctx.shadowColor = "#7ec77a"; ctx.shadowBlur = 8 * v; }
      ctx.fillRect(bx0, by, bw * v, bh); ctx.shadowBlur = 0;
      ctx.fillStyle = "#5a2a20"; ctx.fillRect(bx0 + bw * fire, by, 1, bh);          // redline tick
      ctx.fillStyle = hot ? "#e7e7ea" : "#6a6a70"; ctx.textAlign = "right";
      ctx.fillText(("" + Math.round(v * 100)).padStart(3, "0") + "%", x0 + panelW, y + rh / 2);
    }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // 3D Processor Die — a depth stack of die layers, each reading a different
  // slice of the wave, drawn back-to-front (painter's order). Built on FUI.cell;
  // composition (a widget made of stacked simpler widgets) is the point.
  function die3d(ctx, W, H, F) {
    var S = F.S, bx = F.bufX, L = bx.length, t = F.t, seed = Math.round(+S.seed || 0), fire = S.fire;
    var cols = Math.max(2, Math.round(S.cols)), rows = Math.max(2, Math.round(S.rows)), layers = Math.max(2, Math.round(S.depth));
    var cell0 = S.cell != null ? S.cell : 30, gap0 = Math.max(2, Math.round(cell0 * 0.12));
    var doff = S.doff != null ? S.doff : 1, offop = S.offop != null ? S.offop : 0.4;
    var dvx0 = cell0 * 0.6 * doff, dvy0 = -cell0 * 0.46 * doff;        // per-layer depth offset (dialed by Depth offset)
    var gridW = cols * cell0 + (cols - 1) * gap0, gridH = rows * cell0 + (rows - 1) * gap0;
    var spanW = gridW + Math.abs(dvx0) * (layers - 1), spanH = gridH + Math.abs(dvy0) * (layers - 1);
    var fit = Math.min(1, (W * 0.9) / spanW, (H * 0.84) / spanH);
    var cell = cell0 * fit, g = gap0 * fit, dx = dvx0 * fit, dy = dvy0 * fit;
    var gw = cols * cell + (cols - 1) * g, gh = rows * cell + (rows - 1) * g;
    var ox = W / 2 - gw / 2 - dx * (layers - 1) / 2, oy = H / 2 - gh / 2 - dy * (layers - 1) / 2;
    var sliceStep = Math.max(1, Math.round(L / layers * 0.5));
    for (var l = layers - 1; l >= 0; l--) {                            // back → front
      var lx = ox + dx * l, ly = oy + dy * l;
      var front = 1 - l / (layers - 1 || 1), fade = 0.32 + 0.68 * front, off = l * sliceStep;
      if (offop > 0.01) { ctx.globalAlpha = fade * offop * 0.6; ctx.strokeStyle = "#1f5e4e"; ctx.lineWidth = 1;
        ctx.strokeRect(lx - 4 * fit, ly - 4 * fit, gw + 8 * fit, gh + 8 * fit); }
      for (var r2 = 0; r2 < rows; r2++) for (var c = 0; c < cols; c++) {
        var i = r2 * cols + c;
        var v = Math.max(0, Math.min(1, bx[(i * 37 + seed * 13 + off) % L] * (0.6 + 0.4 * Math.sin(t * 3 + i + seed + l * 0.7))));
        var on = v > fire; if (!on && offop <= 0.01) continue;        // hide off cells entirely at 0
        ctx.globalAlpha = on ? fade : fade * offop;
        FUI.cell(ctx, lx + c * (cell + g), ly + r2 * (cell + g), cell, cell, v, fire, 9 * fade);
      }
    }
    ctx.globalAlpha = 1;
  }

  // one honeycomb layer (pointy-top hexes, offset rows) at origin ox,oy, radius r
  function hexLayer(ctx, F, ox, oy, r, fade, off, offop) {
    var S = F.S, bx = F.bufX, L = bx.length, t = F.t, seed = Math.round(+S.seed || 0), fire = S.fire;
    var cols = Math.max(2, Math.round(S.cols)), rows = Math.max(2, Math.round(S.rows));
    var hw = Math.sqrt(3) * r, vstep = 1.5 * r;
    for (var q = 0; q < rows; q++) for (var c = 0; c < cols; c++) {
      var i = q * cols + c;
      var cxp = ox + c * hw + (q & 1) * (hw / 2) + hw / 2, cyp = oy + q * vstep + r;
      var v = Math.max(0, Math.min(1, bx[(i * 37 + seed * 13 + off) % L] * (0.6 + 0.4 * Math.sin(t * 3 + i + seed + off * 0.02))));
      var on = v > fire; if (!on && offop <= 0.01) continue;
      ctx.globalAlpha = on ? fade : fade * offop;
      FUI.hexCell(ctx, cxp, cyp, r * 0.94, v, fire, 10 * fade);
    }
    ctx.globalAlpha = 1;
  }
  // Hex grid — honeycomb of cells lit by their field sample. Fixed hex size;
  // Columns/Rows grow the comb (designer-sized).
  function hex(ctx, W, H, F) {
    var S = F.S, cols = Math.max(2, Math.round(S.cols)), rows = Math.max(2, Math.round(S.rows));
    var r0 = S.hexr != null ? S.hexr : 24, hw0 = Math.sqrt(3) * r0, vs0 = 1.5 * r0;
    var totalW = cols * hw0 + hw0 / 2, totalH = (rows - 1) * vs0 + 2 * r0;
    var fit = Math.min(1, (W * 0.86) / totalW, (H * 0.82) / totalH), r = r0 * fit;
    var gw = cols * Math.sqrt(3) * r + Math.sqrt(3) * r / 2, gh = (rows - 1) * 1.5 * r + 2 * r;
    hexLayer(ctx, F, W / 2 - gw / 2, H / 2 - gh / 2, r, 1, 0, 1);   // 2D: off cells opaque
  }
  // Hex grid (3D) — depth stack of honeycomb layers, each a different wave slice
  function hex3d(ctx, W, H, F) {
    var S = F.S, cols = Math.max(2, Math.round(S.cols)), rows = Math.max(2, Math.round(S.rows)), layers = Math.max(2, Math.round(S.depth));
    var r0 = S.hexr != null ? S.hexr : 20, hw0 = Math.sqrt(3) * r0, vs0 = 1.5 * r0;
    var doff = S.doff != null ? S.doff : 1, offop = S.offop != null ? S.offop : 0.4;
    var baseW = cols * hw0 + hw0 / 2, baseH = (rows - 1) * vs0 + 2 * r0, dvx0 = r0 * 1.05 * doff, dvy0 = -r0 * 0.85 * doff;
    var spanW = baseW + Math.abs(dvx0) * (layers - 1), spanH = baseH + Math.abs(dvy0) * (layers - 1);
    var fit = Math.min(1, (W * 0.9) / spanW, (H * 0.84) / spanH), r = r0 * fit, dx = dvx0 * fit, dy = dvy0 * fit;
    var gw = cols * Math.sqrt(3) * r + Math.sqrt(3) * r / 2, gh = (rows - 1) * 1.5 * r + 2 * r;
    var L = F.bufX.length, sliceStep = Math.max(1, Math.round(L / layers * 0.5));
    var ox0 = W / 2 - gw / 2 - dx * (layers - 1) / 2, oy0 = H / 2 - gh / 2 - dy * (layers - 1) / 2;
    for (var l = layers - 1; l >= 0; l--) {
      var front = 1 - l / (layers - 1 || 1), fade = 0.32 + 0.68 * front;
      hexLayer(ctx, F, ox0 + dx * l, oy0 + dy * l, r, fade, l * sliceStep, offop);
    }
    ctx.globalAlpha = 1;
  }

  // Radial Spectrum — circular equalizer; bars radiate from a ring (sweep field ⇒ wave around the ring)
  function radialSpectrum(ctx, W, H, F) {
    var S = F.S, cx = W / 2, cy = H / 2, fire = S.fire, seed = Math.round(+S.seed || 0);
    var bins = Math.max(8, Math.round(S.bins)), rin = Math.min(W, H) * 0.5 * (S.rin != null ? S.rin : 0.4);
    var maxLen = Math.min(W, H) * 0.5 - rin - 14, lw = Math.max(2, 2 * Math.PI * rin / bins * 0.55);
    FUI.tickRing(ctx, cx, cy, rin, bins, { len: 5, color: "#16323f" });
    FUI.arc(ctx, cx, cy, rin - 4, 0, Math.PI * 2, { color: "#1f5e4e", lw: 1 });
    for (var i = 0; i < bins; i++) {
      var v = Shaping.fieldValue(F, i, bins, seed), a = i / bins * Math.PI * 2 - Math.PI / 2, hot = v > fire, len = maxLen * v;
      var x0 = cx + Math.cos(a) * rin, y0 = cy + Math.sin(a) * rin, x1 = cx + Math.cos(a) * (rin + len), y1 = cy + Math.sin(a) * (rin + len);
      ctx.strokeStyle = hot ? "hsl(" + (150 + v * 120) + ",85%,60%)" : "#1b3a33"; ctx.lineWidth = lw;
      if (hot) { ctx.shadowColor = FUI.GLOW; ctx.shadowBlur = 8 * v; }
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.shadowBlur = 0;
    }
  }

  // Reticle / Lock-on — targeting reticle; brackets snap + colour flips on lock, optional callouts
  function reticle(ctx, W, H, F) {
    var S = F.S, cx = W / 2, cy = H / 2, t = F.t, fire = S.fire, e = Math.max(0, Math.min(1, F.n));
    var R = Math.min(W, H) * 0.36 * (S.rsize != null ? S.rsize : 1), spin = S.spin != null ? S.spin : 0.4, locked = e > fire;
    var col = locked ? "#e8a838" : FUI.GLOW;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * spin); FUI.tickRing(ctx, 0, 0, R, 36, { len: 8, color: locked ? "#7a5a1e" : "#1f5e4e" }); ctx.restore();
    FUI.arc(ctx, cx, cy, R * 0.92, t * spin, t * spin + Math.PI * 0.5, { color: col, lw: 2, glow: locked ? 12 : 0 });
    FUI.arc(ctx, cx, cy, R * 0.92, t * spin + Math.PI, t * spin + Math.PI * 1.5, { color: col, lw: 2, glow: locked ? 12 : 0 });
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.7; ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx - R * 0.2, cy); ctx.moveTo(cx + R * 0.2, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy - R * 0.2); ctx.moveTo(cx, cy + R * 0.2); ctx.lineTo(cx, cy + R); ctx.stroke(); ctx.globalAlpha = 1;
    var br = (locked ? 0.34 : 0.52) * R; FUI.bracket(ctx, cx - br, cy - br, br * 2, br * 2, R * 0.16, { color: col, lw: 2 });
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, locked ? 4 + e * 3 : 2, 0, 7); ctx.fill();
    if (S.callouts) {
      ctx.strokeStyle = col; ctx.globalAlpha = 0.55; ctx.beginPath();
      ctx.moveTo(cx + br * 0.9, cy - br * 0.9); ctx.lineTo(cx + R * 0.7, cy - R * 0.7); ctx.lineTo(cx + R * 1.04, cy - R * 0.7); ctx.stroke(); ctx.globalAlpha = 1;
      FUI.readout(ctx, cx + R * 0.74, cy - R * 0.74, locked ? "● LOCK" : "○ TRACK", { color: col, size: 12 });
      FUI.readout(ctx, cx + R * 0.74, cy - R * 0.74 + 15, "SIG " + ("" + Math.round(e * 100)).padStart(3, "0") + "%", { color: "#7d7d85", size: 11 });
    }
  }

  // Compass / heading strip — scrolling heading tape; bearing from the signal
  function compass(ctx, W, H, F) {
    var cx = W / 2, cy = H / 2, e = Math.max(0, Math.min(1, F.n));
    var range = F.S.crange != null ? F.S.crange : 120, heading = e * 360, stripW = Math.min(W * 0.82, 760), x0 = cx - stripW / 2, y = cy;
    var dirs = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };
    ctx.strokeStyle = "#1f5e4e"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + stripW, y); ctx.stroke();
    ctx.font = "11px ui-monospace,monospace"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var d = Math.floor((heading - range / 2) / 10) * 10; d <= heading + range / 2; d += 10) {
      var dd = ((d % 360) + 360) % 360, fx = x0 + ((d - (heading - range / 2)) / range) * stripW;
      if (fx < x0 - 1 || fx > x0 + stripW + 1) continue;
      var major = dd % 30 === 0;
      ctx.strokeStyle = major ? FUI.GLOW : "#2a4a44"; ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx, y - (major ? 14 : 7)); ctx.stroke();
      if (dirs[dd]) { ctx.fillStyle = "#7df0c2"; ctx.fillText(dirs[dd], fx, y + 5); }
      else if (major) { ctx.fillStyle = "#56565d"; ctx.fillText("" + dd, fx, y + 5); }
    }
    ctx.fillStyle = "#e8a838"; ctx.beginPath(); ctx.moveTo(cx, y - 20); ctx.lineTo(cx - 6, y - 30); ctx.lineTo(cx + 6, y - 30); ctx.closePath(); ctx.fill();
    ctx.textBaseline = "alphabetic";
    FUI.readout(ctx, cx, y - 40, ("" + Math.round(heading)).padStart(3, "0") + "°", { color: "#e8a838", size: 16, align: "center" });
  }

  // Wireframe globe / orbit — rotating wire sphere + signal-driven orbiting blips
  function globe(ctx, W, H, F) {
    var S = F.S, cx = W / 2, cy = H / 2, t = F.t, seed = Math.round(+S.seed || 0), fire = S.fire;
    var R = Math.min(W, H) * 0.36 * (S.gr != null ? S.gr : 1), spin = t * (S.gspin != null ? S.gspin : 0.3);
    var lon = Math.max(2, Math.round(S.lon != null ? S.lon : 6)), lat = Math.max(1, Math.round(S.lat != null ? S.lat : 4));
    FUI.arc(ctx, cx, cy, R, 0, Math.PI * 2, { color: "#1f5e4e", lw: 1.5 });
    ctx.strokeStyle = "#16323f"; ctx.lineWidth = 1;
    for (var i = 1; i <= lat; i++) { var ph = i / (lat + 1) * Math.PI - Math.PI / 2, ry = Math.cos(ph) * R, yy = cy + Math.sin(ph) * R;
      ctx.beginPath(); ctx.ellipse(cx, yy, Math.abs(ry), Math.abs(ry) * 0.26, 0, 0, Math.PI * 2); ctx.stroke(); }
    for (var j = 0; j < lon; j++) { var a = spin + j / lon * Math.PI, rx = Math.abs(Math.cos(a)) * R;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2); ctx.stroke(); }
    var orbits = Math.max(0, Math.round(S.orbits != null ? S.orbits : 8));
    for (var k = 0; k < orbits; k++) {
      var v = Shaping.fieldValue(F, k, orbits, seed); if (v <= fire) continue;
      var a2 = spin * 1.6 + k / orbits * Math.PI * 2, band = (Math.sin(k * 1.7 + seed) * 0.55);
      var px = cx + Math.cos(a2) * R * 0.95, py = cy + Math.sin(a2) * R * 0.3 + band * R * 0.6;
      ctx.fillStyle = "hsl(" + (150 + v * 120) + ",85%,60%)"; ctx.shadowColor = FUI.GLOW; ctx.shadowBlur = 8 * v;
      ctx.beginPath(); ctx.arc(px, py, 2 + v * 3, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  var WIDGETS = { synapse: synapse, packets: packets, core: core, equalizer: equalizer, radar: radar, telemetry: telemetry, die3d: die3d, hex: hex, hex3d: hex3d, radial: radialSpectrum, reticle: reticle, compass: compass, globe: globe };
  function render(ctx, W, H, F) { (WIDGETS[F.S.widget] || synapse)(ctx, W, H, F); }

  var f2 = function (v) { return (+v).toFixed(2); };
  root.Demo = {
    title: "FUI Kit",
    driver: { x: { src: "sine", rate: 1.5 }, y: { src: "sine", rate: 2, phase: 0.1 }, drive: "mult" },
    structure: [
      { tier: "structure", key: "widget", label: "Widget", type: "select", value: "synapse", options: [
        { value: "synapse", label: "Synapse net" }, { value: "packets", label: "Data packets" }, { value: "core", label: "Processor die" }, { value: "equalizer", label: "Equalizer" }, { value: "radar", label: "Radar" }, { value: "telemetry", label: "Telemetry stack" }, { value: "die3d", label: "Processor die (3D)" }, { value: "hex", label: "Hex grid" }, { value: "hex3d", label: "Hex grid (3D)" }, { value: "radial", label: "Radial spectrum" }, { value: "reticle", label: "Reticle / lock-on" }, { value: "compass", label: "Compass strip" }, { value: "globe", label: "Wireframe globe" } ] },
      // bespoke per widget
      { tier: "structure", key: "nodes",   label: "Nodes",        type: "slider", min: 6, max: 28, step: 1, value: 15, when: { widget: "synapse" } },
      { tier: "structure", key: "connect", label: "Connectivity", type: "slider", min: 1, max: 4, step: 1, value: 2, when: { widget: "synapse" } },
      { tier: "structure", key: "lanes",   label: "Lanes",        type: "slider", min: 3, max: 14, step: 1, value: 6, when: { widget: "packets" } },
      { tier: "structure", key: "cols",    label: "Columns",      type: "slider", min: 2, max: 24, step: 1, value: 10, when: { widget: ["core", "die3d", "hex", "hex3d"] } },
      { tier: "structure", key: "rows",    label: "Rows",         type: "slider", min: 2, max: 16, step: 1, value: 7, when: { widget: ["core", "die3d", "hex", "hex3d"] } },
      { tier: "structure", key: "cell",    label: "Cell size <span>px</span>", type: "slider", min: 16, max: 56, step: 2, value: 36, when: { widget: ["core", "die3d"] } },
      { tier: "structure", key: "hexr",    label: "Hex size <span>px</span>", type: "slider", min: 12, max: 44, step: 1, value: 24, when: { widget: ["hex", "hex3d"] } },
      { tier: "structure", key: "depth",   label: "Depth <span>layers</span>", type: "slider", min: 2, max: 12, step: 1, value: 6, when: { widget: ["die3d", "hex3d"] } },
      { tier: "structure", key: "doff",    label: "Depth offset <span>3D-ness</span>", type: "slider", min: 0, max: 2.5, step: 0.05, value: 1, fmt: f2, when: { widget: ["die3d", "hex3d"] } },
      { tier: "structure", key: "offop",   label: "Off-cell opacity", type: "slider", min: 0, max: 1, step: 0.01, value: 0.4, fmt: f2, when: { widget: ["die3d", "hex3d"] } },
      { tier: "structure", key: "bands",   label: "Bands",        type: "slider", min: 4, max: 64, step: 1, value: 24, when: { widget: "equalizer" } },
      { tier: "structure", key: "barw",    label: "Bar width <span>px</span>", type: "slider", min: 8, max: 40, step: 2, value: 18, when: { widget: "equalizer" } },
      { tier: "structure", key: "blips",   label: "Blips",        type: "slider", min: 4, max: 32, step: 1, value: 14, when: { widget: "radar" } },
      { tier: "structure", key: "lines",   label: "Lines",        type: "slider", min: 2, max: 16, step: 1, value: 8, when: { widget: "telemetry" } },
      { tier: "structure", key: "lineh",   label: "Row height <span>px</span>", type: "slider", min: 18, max: 48, step: 2, value: 30, when: { widget: "telemetry" } },
      { tier: "structure", key: "bins",    label: "Bins",         type: "slider", min: 16, max: 96, step: 1, value: 48, when: { widget: "radial" } },
      { tier: "structure", key: "rin",     label: "Inner radius", type: "slider", min: 0.2, max: 0.6, step: 0.02, value: 0.4, fmt: f2, when: { widget: "radial" } },
      { tier: "structure", key: "rsize",   label: "Reticle size", type: "slider", min: 0.5, max: 1.3, step: 0.05, value: 1, fmt: f2, when: { widget: "reticle" } },
      { tier: "structure", key: "spin",    label: "Spin speed",   type: "slider", min: 0, max: 2, step: 0.05, value: 0.4, fmt: f2, when: { widget: "reticle" } },
      { tier: "structure", key: "callouts", label: "Callouts",    type: "toggle", value: true, when: { widget: "reticle" } },
      { tier: "structure", key: "crange",  label: "Visible arc <span>°</span>", type: "slider", min: 60, max: 240, step: 10, value: 120, when: { widget: "compass" } },
      { tier: "structure", key: "gr",      label: "Radius",       type: "slider", min: 0.5, max: 1.2, step: 0.05, value: 1, fmt: f2, when: { widget: "globe" } },
      { tier: "structure", key: "lon",     label: "Meridians",    type: "slider", min: 3, max: 14, step: 1, value: 6, when: { widget: "globe" } },
      { tier: "structure", key: "lat",     label: "Parallels",    type: "slider", min: 2, max: 8, step: 1, value: 4, when: { widget: "globe" } },
      { tier: "structure", key: "orbits",  label: "Orbit blips",  type: "slider", min: 0, max: 16, step: 1, value: 8, when: { widget: "globe" } },
      { tier: "structure", key: "gspin",   label: "Spin speed",   type: "slider", min: 0, max: 1.5, step: 0.05, value: 0.3, fmt: f2, when: { widget: "globe" } },
      { tier: "structure", key: "seed",    label: "Seed", type: "slider", min: 1, max: 9999, step: 1, value: 1941 }
    ],
    shaping: [
      root.SignalShaping.fieldSpec("stagger"),
      { tier: "shaping", key: "fire",    label: "Fire ≥ <span>threshold</span>", type: "slider", min: 0, max: 1, step: 0.01, value: 0.45, fmt: f2 },
      { tier: "shaping", key: "density", label: "Density",     type: "slider", min: 0, max: 1, step: 0.01, value: 0.5, fmt: f2, when: { widget: "packets" } },
      { tier: "shaping", key: "propag",  label: "Edge speed",  type: "slider", min: 0.1, max: 3, step: 0.05, value: 0.6, fmt: f2, when: { widget: "synapse" } },
      { tier: "shaping", key: "seq",     label: "Sequencing",  type: "slider", min: 0, max: 1, step: 0.01, value: 0, fmt: f2, when: { widget: "synapse" } },
      { tier: "shaping", key: "sweep",   label: "Sweep speed", type: "slider", min: 0.1, max: 3, step: 0.05, value: 0.8, fmt: f2, when: { widget: "radar" } }
    ],
    presets: (root.DemoPresets || {}),
    // curated plugin-lets: a focused instrument = preset + a small public control set
    pluginlets: [
      { name: "Neural Net", preset: "Neural Net", desc: "A living network. Dial the source and how readily nodes fire.",
        controls: ["_src", "_rate", "nodes", "fire"] },
      { name: "Radar", preset: "Radar", desc: "A sweep that paints contacts from the signal.",
        controls: ["_src", "_rate", "blips", "sweep", "fire"] },
      { name: "Processor Die", preset: "Processor", desc: "A chip lighting up. Size the grid; set the activity threshold.",
        controls: ["_src", "_rate", "cols", "rows", "fire"] }
    ],
    render: render
  };
})(typeof self !== "undefined" ? self : this);
