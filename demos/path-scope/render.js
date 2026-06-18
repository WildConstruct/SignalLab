/*
 * PATH & SCOPE — wave / vectorscope / spirograph / rose  (demos/path-scope/render.js)
 * -------------------------------------------------------------------------
 * The raw signal AS geometry. A variant picker switches between ports of tool's
 * trace / orbitPath / spiro / rose. Best surface to feel the Combine selector
 * and the raw buffers. Reads bufX/bufY directly + n for the rose petal count.
 * -------------------------------------------------------------------------
 */
(function (root) {
  "use strict";
  var combine = root.SignalEngine.combine, Attractor = root.Attractor, Proj3 = root.Proj3;

  function waveRunner(ctx, W, H, F, mode) {
    var bx = F.bufX, by = F.bufY, L = bx.length;
    ctx.strokeStyle = "#1d2a34"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.strokeStyle = "#2a6"; ctx.lineWidth = F.S.weight; ctx.beginPath();
    for (var i = 0; i < L; i++) { var dv = combine(mode, bx[i], by[i]), x = i / (L - 1) * W, y = (1 - dv) * (H - 24) + 12; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    var dvE = combine(mode, bx[L - 1], by[L - 1]), px = W - 14, py = (1 - dvE) * (H - 24) + 12;
    ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 16; ctx.fillStyle = "#36f09a"; ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  function vectorscope(ctx, W, H, F) {
    var bx = F.bufX, by = F.bufY, L = bx.length, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.4 * F.S.radius;
    ctx.strokeStyle = "#16323f"; ctx.lineWidth = 1; ctx.beginPath();
    for (var i = 0; i < L; i++) { var x = cx + (bx[i] * 2 - 1) * R, y = cy - (by[i] * 2 - 1) * R; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    var hx = cx + (bx[L - 1] * 2 - 1) * R, hy = cy - (by[L - 1] * 2 - 1) * R;
    ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 16; ctx.fillStyle = "#36f09a"; ctx.beginPath(); ctx.arc(hx, hy, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  function spirograph(ctx, W, H, F) {
    var bx = F.bufX, L = bx.length, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42 * F.S.radius, turns = Math.max(1, F.S.turns);
    ctx.strokeStyle = "#36f09a"; ctx.lineWidth = 1.4; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8; ctx.beginPath();
    for (var i = 0; i < L; i++) { var a = i / (L - 1) * Math.PI * 2 * turns, rr = R * (0.18 + 0.82 * bx[i]), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  function rose(ctx, W, H, F) {
    var bx = F.bufX, L = bx.length, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42 * F.S.radius;
    var k = Math.round(F.S.turns) || (3 + Math.round(Math.max(0, Math.min(1, F.n)) * 4));
    ctx.strokeStyle = "#36f09a"; ctx.lineWidth = 1.5; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 8; ctx.beginPath();
    for (var i = 0; i <= L; i++) { var th = i / L * Math.PI * 2, rr = R * Math.abs(Math.cos(k * th)) * (0.3 + 0.7 * bx[i % L]), x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke(); ctx.shadowBlur = 0;
  }

  // Surfaces the attractor engine driver + proj3. The signal perturbs one system
  // constant (so the shape breathes); 3D systems are projected with an auto yaw.
  function attractor(ctx, W, H, F) {
    var S = F.S, t = F.t, e = Math.max(0, Math.min(1, F.n)), sys = S.system || "lorenz";
    var base = Attractor.DEFAULTS(sys), morph = S.morph != null ? S.morph : 0.5, dev = (e - 0.5) * morph, params = {};
    if (sys === "lorenz") params.b = base.b + dev * 18;            // ρ
    else if (sys === "aizawa") params.a = base.a + dev * 0.5;
    else if (sys === "thomas") params.b = base.b + dev * 0.14;
    else params.a = base.a + dev * 1.4;                            // maps: a
    var r = Attractor.trace(sys, params, { n: 2600 }), pts = r.pts, L = pts.length;
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.44 * (S.radius != null ? S.radius : 1);
    var is3d = r.dim === 3, cam = { yaw: t * (S.spin != null ? S.spin : 0.25), pitch: 0.5, dist: 3.2 };
    if (sys === "dejong" || sys === "clifford") {                  // dense point cloud
      ctx.fillStyle = "rgba(54,240,154,0.45)";
      for (var i = 0; i < L; i++) ctx.fillRect(cx + pts[i][0] * R, cy + pts[i][1] * R, 1.2, 1.2);
    } else {                                                       // trajectory (projected if 3D)
      ctx.strokeStyle = "#36f09a"; ctx.lineWidth = 1; ctx.globalAlpha = 0.85; ctx.shadowColor = "#36f09a"; ctx.shadowBlur = 6; ctx.beginPath();
      for (var k = 0; k < L; k++) { var p = pts[k], sx, sy;
        if (is3d) { var pr = Proj3.project({ x: p[0], y: p[1], z: p[2] }, cam); sx = cx + pr.x * R; sy = cy + pr.y * R; }
        else { sx = cx + p[0] * R; sy = cy + p[1] * R; }
        if (k) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }
      ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  }

  function render(ctx, W, H, F) {
    var mode = F.S._drive || "x";
    switch (F.S.variant) {
      case "vector":    vectorscope(ctx, W, H, F); break;
      case "spiro":     spirograph(ctx, W, H, F); break;
      case "rose":      rose(ctx, W, H, F); break;
      case "attractor": attractor(ctx, W, H, F); break;
      default:          waveRunner(ctx, W, H, F, mode);
    }
  }

  root.Demo = {
    title: "Path & Scope",
    driver: { x: { src: "sine", rate: 2 }, y: { src: "triangle", rate: 3, phase: 0.1 }, drive: "mult" },
    structure: [
      { tier: "structure", key: "variant", label: "Path type", type: "select", value: "wave", options: [
        { value: "wave", label: "Wave runner" }, { value: "vector", label: "Vectorscope" }, { value: "spiro", label: "Spirograph" }, { value: "rose", label: "Rose curve" }, { value: "attractor", label: "Strange attractor" } ] },
      { tier: "structure", key: "system", label: "System", type: "select", value: "lorenz", options: [
        { value: "lorenz", label: "Lorenz (3D)" }, { value: "aizawa", label: "Aizawa (3D)" }, { value: "thomas", label: "Thomas (3D)" }, { value: "dejong", label: "De Jong (2D)" }, { value: "clifford", label: "Clifford (2D)" } ], when: { variant: "attractor" } },
      { tier: "structure", key: "spin",   label: "Rotate <span>3D</span>", type: "slider", min: 0, max: 1, step: 0.02, value: 0.25, fmt: function (v) { return (+v).toFixed(2); }, when: { variant: "attractor" } },
      { tier: "structure", key: "turns",  label: "Turns / petals", type: "slider", min: 1, max: 10, step: 1, value: 4, when: { variant: ["spiro", "rose"] } },
      { tier: "structure", key: "radius", label: "Radius", type: "slider", min: 0.4, max: 1.2, step: 0.05, value: 1, fmt: function (v) { return (+v).toFixed(2); }, when: { variant: ["vector", "spiro", "rose", "attractor"] } },
      { tier: "structure", key: "weight", label: "Line weight", type: "slider", min: 1, max: 5, step: 0.5, value: 2, fmt: function (v) { return (+v).toFixed(1); }, when: { variant: "wave" } }
    ],
    shaping: [
      { tier: "shaping", key: "morph", label: "Signal → shape", type: "slider", min: 0, max: 1, step: 0.01, value: 0.5, fmt: function (v) { return (+v).toFixed(2); }, when: { variant: "attractor" } }
    ],
    presets: (root.DemoPresets || {}),
    render: render
  };
})(typeof self !== "undefined" ? self : this);
