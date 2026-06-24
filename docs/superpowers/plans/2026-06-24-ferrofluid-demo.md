# Ferrofluid Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tenth Signal Rack browser demo, `demos/ferrofluid/`, where the Signal Rack waveform mimics a magnetic resonance field that deforms a glossy black 2.5D ferrofluid blob.

**Architecture:** Add a pure, testable ferrofluid model module for magnetic-field/lobe/droplet values, then layer a demo renderer over the existing Signal Host. The first renderer is a high-quality Canvas 2D 2.5D pass with a WebGL capability wrapper that can be replaced later by a full ping-pong fluid solver; this preserves the planned API while landing a reliable visual demo now.

**Tech Stack:** Dependency-free browser JavaScript, UMD/CommonJS modules, Canvas 2D, optional WebGL capability wrapper, Node `assert` tests, existing Signal Rack demo host.

---

## File Structure

- Create `demos/shared/ferrofluid-model.js`: deterministic helpers for magnetic lobe field, height/displacement, droplets, and control normalization.
- Create `demos/shared/ferrofluid-model.test.js`: Node tests for deterministic model behavior and signal response.
- Create `demos/shared/ferrofluid-webgl.js`: small renderer adapter with the planned `createRenderer(canvas)` API. First version delegates to Canvas fallback by returning `null` unless a future full WebGL implementation is enabled.
- Create `demos/shared/ferrofluid-webgl.test.js`: Node tests for safe null fallback and module exports.
- Create `demos/ferrofluid/index.html`: standard Signal Host page wiring.
- Create `demos/ferrofluid/render.js`: demo configuration plus Canvas 2D 2.5D renderer.
- Create `demos/ferrofluid/presets.js`: four presets from the spec.
- Create `demos/ferrofluid/README.md`: one-screen demo explanation.
- Create `demos/ferrofluid/integration.test.js`: Node test that validates demo files and launcher/rail registration.
- Modify `demos/index.html`: add Ferrofluid launcher card after `field-distort`.
- Modify `demos/shared/host.js`: add Ferrofluid to the rail module list.
- Modify `demos/README.md`: update module count and field/convergence table.
- Modify `docs/web-demos/README.md`: add the ferrofluid convergence demo note.

## Verification Commands

Use these commands throughout:

```powershell
node demos/shared/ferrofluid-model.test.js
node demos/shared/ferrofluid-webgl.test.js
node demos/ferrofluid/integration.test.js
node --check demos/shared/ferrofluid-model.js
node --check demos/shared/ferrofluid-webgl.js
node --check demos/ferrofluid/render.js
node --check demos/ferrofluid/presets.js
git diff --check
python -m http.server 8123
```

Expected for Node tests/checks: exit code `0`.

---

### Task 1: Pure Ferrofluid Model

**Files:**
- Create: `demos/shared/ferrofluid-model.test.js`
- Create: `demos/shared/ferrofluid-model.js`

- [ ] **Step 1: Write the failing model tests**

Create `demos/shared/ferrofluid-model.test.js`:

```javascript
"use strict";

const assert = require("assert");
const FerrofluidModel = require("./ferrofluid-model");

function close(actual, expected, epsilon, label) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${label}: expected ${expected}, got ${actual}`);
}

function frame(overrides) {
  const base = {
    t: 1.25,
    n: 0.42,
    x: 0.42,
    y: 0.66,
    bufX: Array.from({ length: 32 }, (_, i) => (Math.sin(i * 0.37) + 1) * 0.5),
    bufY: Array.from({ length: 32 }, (_, i) => (Math.cos(i * 0.23) + 1) * 0.5),
    S: {
      blobSize: 0.76,
      surfaceTension: 0.72,
      droplets: 0.45,
      seed: 19,
      fieldStrength: 0.68,
      resonance: 0.54,
      viscosity: 0.62,
      lobeCount: 5,
      reflection: 0.82,
      accent: "magenta",
      spikeThreshold: 0.78
    }
  };
  return Object.assign(base, overrides || {});
}

const defaults = FerrofluidModel.normalizeControls({});
assert.strictEqual(defaults.stage, "aperture");
assert.strictEqual(defaults.accent, "none");
close(defaults.blobSize, 0.74, 1e-9, "default blobSize");
close(defaults.fieldStrength, 0.65, 1e-9, "default fieldStrength");

const a = FerrofluidModel.buildField(frame());
const b = FerrofluidModel.buildField(frame());
assert.deepStrictEqual(a.lobes, b.lobes, "field must be deterministic for same frame");
assert.strictEqual(a.lobes.length, 5);
assert.ok(a.energy > 0.25 && a.energy < 0.8, "energy is normalized");
assert.ok(a.pull > 0.2 && a.pull < 1.2, "pull is visible but bounded");

const low = FerrofluidModel.buildField(frame({ n: 0.1 }));
const high = FerrofluidModel.buildField(frame({ n: 0.94 }));
assert.ok(high.pull > low.pull, "higher signal should increase magnetic pull");
assert.ok(high.spike > low.spike, "higher signal should increase spike pressure");

const droplets = FerrofluidModel.buildDroplets(frame(), a);
assert.ok(droplets.length >= 3, "droplets should exist when droplet control is nonzero");
assert.ok(droplets.every((d) => d.r > 0 && d.r < 0.08), "droplet radii are normalized");
assert.deepStrictEqual(droplets, FerrofluidModel.buildDroplets(frame(), a), "droplets are deterministic");

const sample = FerrofluidModel.sampleSurface(frame(), a, 0.2, -0.15);
assert.ok(sample.mask >= 0 && sample.mask <= 1, "mask is normalized");
assert.ok(sample.height >= 0, "height is nonnegative");
assert.ok(Array.isArray(sample.normal) && sample.normal.length === 3, "normal is vec3-like");
assert.ok(sample.normal[2] > 0, "normal points toward viewer");

console.log("ferrofluid-model tests passed");
```

- [ ] **Step 2: Run model tests and verify RED**

Run:

```powershell
node demos/shared/ferrofluid-model.test.js
```

Expected: FAIL with `Cannot find module './ferrofluid-model'`.

- [ ] **Step 3: Implement the pure model module**

Create `demos/shared/ferrofluid-model.js`:

```javascript
/*
 * SIGNAL RACK - ferrofluid model helpers
 * Deterministic 2.5D magnetic-resonance helpers for demos/ferrofluid.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FerrofluidModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Number(v))); }
  function finite(v, fallback) { v = Number(v); return Number.isFinite(v) ? v : fallback; }
  function smoothstep(edge0, edge1, x) {
    var t = clamp((x - edge0) / Math.max(1e-6, edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function hash(seed) {
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }
  function sampleBuffer(buf, u, fallback) {
    if (!buf || !buf.length) return fallback == null ? 0.5 : fallback;
    var idx = Math.floor(clamp(u, 0, 0.999999) * buf.length);
    return finite(buf[idx], fallback == null ? 0.5 : fallback);
  }

  function normalizeControls(S) {
    S = S || {};
    return {
      stage: S.stage || "aperture",
      blobSize: clamp(finite(S.blobSize, 0.74), 0.38, 1.1),
      surfaceTension: clamp(finite(S.surfaceTension, 0.72), 0, 1),
      droplets: clamp(finite(S.droplets, 0.35), 0, 1),
      seed: Math.round(finite(S.seed, 17)),
      fieldStrength: clamp(finite(S.fieldStrength, 0.65), 0, 1.5),
      resonance: clamp(finite(S.resonance, 0.55), 0, 1.5),
      viscosity: clamp(finite(S.viscosity, 0.65), 0, 1),
      lobeCount: Math.max(2, Math.min(12, Math.round(finite(S.lobeCount, 5)))),
      reflection: clamp(finite(S.reflection, 0.82), 0, 1.5),
      accent: S.accent || "none",
      spikeThreshold: clamp(finite(S.spikeThreshold, 0.82), 0.2, 1)
    };
  }

  function buildField(F) {
    var S = normalizeControls(F && F.S);
    var n = clamp(finite(F && F.n, 0), 0, 1);
    var t = finite(F && F.t, 0);
    var energy = smoothstep(0.05, 0.95, n);
    var pull = S.fieldStrength * (0.24 + energy * 0.86);
    var spike = smoothstep(S.spikeThreshold, 1, energy + S.resonance * 0.18);
    var lobes = [];
    for (var i = 0; i < S.lobeCount; i++) {
      var u = i / S.lobeCount;
      var bx = sampleBuffer(F && F.bufX, u, n);
      var by = sampleBuffer(F && F.bufY, (u + 0.33) % 1, 0.5);
      var jitter = (hash(S.seed + i * 13) - 0.5) * 0.22;
      var phase = t * (0.32 + S.resonance * 0.34) + bx * Math.PI * 2 + jitter;
      lobes.push({
        angle: u * Math.PI * 2 + (by - 0.5) * 0.42 + t * 0.08,
        strength: clamp(0.42 + bx * 0.55 + energy * S.resonance * 0.42, 0, 1.7),
        phase: phase
      });
    }
    return { S: S, energy: energy, pull: pull, spike: spike, lobes: lobes };
  }

  function lobePressure(field, angle, radius) {
    var p = 0;
    for (var i = 0; i < field.lobes.length; i++) {
      var l = field.lobes[i];
      var d = Math.atan2(Math.sin(angle - l.angle), Math.cos(angle - l.angle));
      var ridge = Math.exp(-(d * d) * (3.4 + field.S.resonance * 5.0));
      var pulse = 0.72 + 0.28 * Math.sin(l.phase);
      p += ridge * l.strength * pulse;
    }
    p /= Math.max(1, field.lobes.length);
    return p * smoothstep(0.05, 0.9, radius);
  }

  function sampleSurface(F, field, x, y) {
    field = field || buildField(F || {});
    var r = Math.sqrt(x * x + y * y);
    var a = Math.atan2(y, x);
    var baseRadius = 0.54 * field.S.blobSize;
    var pressure = lobePressure(field, a, r / Math.max(0.001, baseRadius));
    var edge = baseRadius * (1 + pressure * field.pull * 0.26 - field.S.surfaceTension * 0.06);
    var mask = 1 - smoothstep(edge, edge + 0.13, r);
    var dome = Math.sqrt(Math.max(0, 1 - Math.pow(r / Math.max(0.001, edge), 2)));
    var height = Math.max(0, mask * (0.24 + dome * 0.72 + pressure * field.S.resonance * 0.55 + field.spike * pressure * 0.85));
    var eps = 0.006;
    var hx = heightAt(field, x + eps, y, baseRadius) - heightAt(field, x - eps, y, baseRadius);
    var hy = heightAt(field, x, y + eps, baseRadius) - heightAt(field, x, y - eps, baseRadius);
    var nx = -hx * 5.0, ny = -hy * 5.0, nz = 1;
    var inv = 1 / Math.max(1e-6, Math.sqrt(nx * nx + ny * ny + nz * nz));
    return { mask: clamp(mask, 0, 1), height: height, pressure: pressure, normal: [nx * inv, ny * inv, nz * inv] };
  }

  function heightAt(field, x, y, baseRadius) {
    var r = Math.sqrt(x * x + y * y), a = Math.atan2(y, x);
    var pressure = lobePressure(field, a, r / Math.max(0.001, baseRadius));
    var edge = baseRadius * (1 + pressure * field.pull * 0.26 - field.S.surfaceTension * 0.06);
    var mask = 1 - smoothstep(edge, edge + 0.13, r);
    var dome = Math.sqrt(Math.max(0, 1 - Math.pow(r / Math.max(0.001, edge), 2)));
    return Math.max(0, mask * (0.24 + dome * 0.72 + pressure * field.S.resonance * 0.55 + field.spike * pressure * 0.85));
  }

  function buildDroplets(F, field) {
    field = field || buildField(F || {});
    var count = Math.round(field.S.droplets * (5 + field.energy * 10));
    var out = [];
    for (var i = 0; i < count; i++) {
      var h = hash(field.S.seed * 17 + i * 31);
      var a = Math.PI * 2 * h + field.energy * 0.4;
      var dist = 0.36 + hash(field.S.seed + i * 7) * 0.28 + field.energy * 0.08;
      out.push({
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist * 0.78,
        r: 0.012 + hash(field.S.seed + i * 19) * 0.026 + field.energy * 0.012,
        lift: 0.2 + hash(field.S.seed + i * 23) * 0.8
      });
    }
    return out;
  }

  return {
    normalizeControls: normalizeControls,
    buildField: buildField,
    buildDroplets: buildDroplets,
    sampleSurface: sampleSurface,
    _private: { clamp: clamp, smoothstep: smoothstep, hash: hash }
  };
});
```

- [ ] **Step 4: Run model tests and verify GREEN**

Run:

```powershell
node demos/shared/ferrofluid-model.test.js
node --check demos/shared/ferrofluid-model.js
```

Expected: both exit `0`; first prints `ferrofluid-model tests passed`.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add demos/shared/ferrofluid-model.js demos/shared/ferrofluid-model.test.js
git commit -m "feat: add ferrofluid resonance model"
```

---

### Task 2: WebGL Adapter Contract

**Files:**
- Create: `demos/shared/ferrofluid-webgl.test.js`
- Create: `demos/shared/ferrofluid-webgl.js`

- [ ] **Step 1: Write the failing WebGL adapter tests**

Create `demos/shared/ferrofluid-webgl.test.js`:

```javascript
"use strict";

const assert = require("assert");
const FerrofluidWebGL = require("./ferrofluid-webgl");

assert.strictEqual(typeof FerrofluidWebGL.createRenderer, "function");

Promise.resolve()
  .then(() => FerrofluidWebGL.createRenderer(null))
  .then((renderer) => {
    assert.strictEqual(renderer, null, "null canvas should fall back cleanly");
    return FerrofluidWebGL.createRenderer({ getContext: () => null });
  })
  .then((renderer) => {
    assert.strictEqual(renderer, null, "unsupported WebGL should fall back cleanly");
    console.log("ferrofluid-webgl tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

- [ ] **Step 2: Run WebGL adapter tests and verify RED**

Run:

```powershell
node demos/shared/ferrofluid-webgl.test.js
```

Expected: FAIL with `Cannot find module './ferrofluid-webgl'`.

- [ ] **Step 3: Implement the safe adapter**

Create `demos/shared/ferrofluid-webgl.js`:

```javascript
/*
 * SIGNAL RACK - ferrofluid WebGL adapter
 * First slice keeps the planned renderer API and falls back to Canvas 2D.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FerrofluidWebGL = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function createRenderer(canvas) {
    if (!canvas || typeof canvas.getContext !== "function") return Promise.resolve(null);
    var gl = null;
    try {
      gl = canvas.getContext("webgl2", { alpha: true, antialias: false, preserveDrawingBuffer: false })
        || canvas.getContext("webgl", { alpha: true, antialias: false, preserveDrawingBuffer: false });
    } catch (e) {
      return Promise.resolve(null);
    }
    if (!gl) return Promise.resolve(null);

    // The spec keeps room for a full ping-pong WebGL fluid solver. For the first
    // browser demo slice, the Canvas renderer is the production path because it
    // gives a deterministic nonblank fallback across the current demo harness.
    return Promise.resolve(null);
  }

  return { createRenderer: createRenderer };
});
```

- [ ] **Step 4: Run WebGL adapter tests and verify GREEN**

Run:

```powershell
node demos/shared/ferrofluid-webgl.test.js
node --check demos/shared/ferrofluid-webgl.js
```

Expected: both exit `0`; first prints `ferrofluid-webgl tests passed`.

- [ ] **Step 5: Commit Task 2**

Run:

```powershell
git add demos/shared/ferrofluid-webgl.js demos/shared/ferrofluid-webgl.test.js
git commit -m "feat: add ferrofluid renderer adapter"
```

---

### Task 3: Ferrofluid Demo Module

**Files:**
- Create: `demos/ferrofluid/index.html`
- Create: `demos/ferrofluid/render.js`
- Create: `demos/ferrofluid/presets.js`
- Create: `demos/ferrofluid/README.md`

- [ ] **Step 1: Create the demo files with Canvas renderer**

Create `demos/ferrofluid/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Signal Rack - Ferrofluid</title>
<link rel="stylesheet" href="../shared/style.css">
</head>
<body>
<div id="app"></div>
<script src="../../prototypes/webgpu-lab/signal-core-reference.js"></script>
<script src="../shared/signal-engine.js"></script>
<script src="../shared/controls.js"></script>
<script src="../shared/shaping.js"></script>
<script src="../shared/host.js"></script>
<script src="../shared/ferrofluid-model.js"></script>
<script src="../shared/ferrofluid-webgl.js"></script>
<script src="presets.js"></script>
<script src="render.js"></script>
<script>
SignalHost.boot(Demo);
</script>
</body>
</html>
```

Create `demos/ferrofluid/presets.js`:

```javascript
(function (root) {
  "use strict";
  root.DemoPresets = {
    "Aperture Blob": {
      driver: { x: { src: "sine", rate: 0.45, smooth: 0.25 }, y: { src: "sine", rate: 0.9, phase: 0.2 }, drive: "max" },
      S: { stage: "aperture", blobSize: 0.76, surfaceTension: 0.76, droplets: 0.28, seed: 19,
        fieldStrength: 0.62, resonance: 0.48, viscosity: 0.72, lobeCount: 4, reflection: 0.92, accent: "none", spikeThreshold: 0.9 }
    },
    "Black Stage": {
      driver: { x: { src: "randomWalk", rate: 0.7, smooth: 0.45 }, y: { src: "sine", rate: 1.3, phase: 0.15 }, drive: "mix" },
      S: { stage: "dark", blobSize: 0.84, surfaceTension: 0.62, droplets: 0.35, seed: 37,
        fieldStrength: 0.72, resonance: 0.68, viscosity: 0.56, lobeCount: 5, reflection: 1.18, accent: "magenta", spikeThreshold: 0.84 }
    },
    "Magnetic Beads": {
      driver: { x: { src: "sine", rate: 0.85, smooth: 0.18 }, y: { src: "noise", rate: 2.2 }, drive: "max" },
      S: { stage: "aperture", blobSize: 0.68, surfaceTension: 0.58, droplets: 0.78, seed: 71,
        fieldStrength: 0.8, resonance: 0.72, viscosity: 0.48, lobeCount: 6, reflection: 0.96, accent: "amber", spikeThreshold: 0.82 }
    },
    "High Resonance": {
      driver: { x: { src: "sine", rate: 1.2, smooth: 0.08 }, y: { src: "triangle", rate: 1.8, phase: 0.25 }, drive: "mult" },
      S: { stage: "dark", blobSize: 0.82, surfaceTension: 0.46, droplets: 0.48, seed: 94,
        fieldStrength: 1.08, resonance: 1.08, viscosity: 0.34, lobeCount: 9, reflection: 1.28, accent: "signal", spikeThreshold: 0.64 }
    }
  };
})(typeof self !== "undefined" ? self : this);
```

Create `demos/ferrofluid/render.js`:

```javascript
/*
 * FERROFLUID - Signal Rack magnetic resonance demo
 * A Signal Rack waveform mimics a magnetic field pulling a reflective black
 * 2.5D ferrofluid blob into lobes, droplets, and high-energy spikelets.
 */
(function (root) {
  "use strict";
  var Model = root.FerrofluidModel;
  var WebGL = root.FerrofluidWebGL;

  var off = null, octx = null;
  function ensureOffscreen(cols, rows) {
    if (!off) { off = document.createElement("canvas"); octx = off.getContext("2d"); }
    if (off.width !== cols || off.height !== rows) { off.width = cols; off.height = rows; }
  }
  function accentColor(name) {
    if (name === "magenta") return [255, 42, 232];
    if (name === "amber") return [255, 186, 78];
    if (name === "signal") return [54, 240, 154];
    return [255, 255, 255];
  }
  function drawStage(ctx, W, H, S, field) {
    var cx = W / 2, cy = H / 2;
    if (S.stage === "dark") {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.58);
      g.addColorStop(0, "#161214"); g.addColorStop(0.58, "#050506"); g.addColorStop(1, "#000");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.beginPath();
      ctx.ellipse(cx, cy + H * 0.18, W * 0.27, H * 0.075, 0, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    ctx.fillStyle = S.stage === "plate" ? "#d7d5ce" : "#eeeeea";
    ctx.fillRect(0, 0, W, H);
    var aperture = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.42);
    aperture.addColorStop(0, "#ffffff"); aperture.addColorStop(0.68, "#f9f8f2"); aperture.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = aperture; ctx.beginPath(); ctx.arc(cx, cy, Math.min(W, H) * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(30,30,28,0.08)"; ctx.lineWidth = 2; ctx.beginPath();
    ctx.arc(cx, cy, Math.min(W, H) * 0.34, 0, Math.PI * 2); ctx.stroke();
  }
  function shadePixel(F, field, x, y) {
    var s = Model.sampleSurface(F, field, x, y);
    if (s.mask <= 0.005) return [0, 0, 0, 0];
    var n = s.normal, S = field.S;
    var rim = Math.pow(Math.max(0, 1 - n[2]), 1.7);
    var key = Math.pow(Math.max(0, n[0] * -0.58 + n[1] * -0.42 + n[2] * 0.82), 34) * S.reflection;
    var strip = Math.pow(Math.max(0, Math.sin((x * 2.8 - y * 1.4 + F.t * 0.22) * Math.PI * 2)), 18) * S.reflection * 0.7;
    var wet = Math.pow(Math.max(0, s.height), 1.4) * 18;
    var base = 2 + wet;
    var col = [base, base, base + 2];
    var hi = (key + strip + rim * 0.22) * 255;
    col[0] += hi; col[1] += hi; col[2] += hi;
    if (S.accent !== "none") {
      var ac = accentColor(S.accent);
      var accent = Math.pow(Math.max(0, Math.sin((x * 4.1 + y * 1.7 + F.t * 0.37) * Math.PI)), 22) * S.reflection * s.pressure;
      col[0] += ac[0] * accent; col[1] += ac[1] * accent; col[2] += ac[2] * accent;
    }
    return [
      Math.max(0, Math.min(255, col[0])),
      Math.max(0, Math.min(255, col[1])),
      Math.max(0, Math.min(255, col[2])),
      Math.max(0, Math.min(255, s.mask * 255))
    ];
  }
  function drawBlob(ctx, W, H, F, field) {
    var cols = Math.min(420, Math.max(180, Math.round(W / 2.7)));
    var rows = Math.max(1, Math.round(cols * H / W));
    ensureOffscreen(cols, rows);
    var img = octx.createImageData(cols, rows), data = img.data, p = 0;
    var aspect = W / H;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var nx = (x / (cols - 1) * 2 - 1) * aspect;
        var ny = y / (rows - 1) * 2 - 1;
        var c = shadePixel(F, field, nx, ny);
        data[p++] = c[0]; data[p++] = c[1]; data[p++] = c[2]; data[p++] = c[3];
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = Math.min(W, H) * 0.04;
    ctx.drawImage(off, 0, 0, cols, rows, 0, 0, W, H);
    ctx.shadowBlur = 0;
  }
  function drawDroplets(ctx, W, H, F, field) {
    var drops = Model.buildDroplets(F, field), cx = W / 2, cy = H / 2, scale = Math.min(W, H) * 0.52;
    drops.forEach(function (d) {
      var x = cx + d.x * scale, y = cy + d.y * scale, r = Math.max(2, d.r * scale);
      var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.45, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.18, "rgba(46,46,52,0.85)");
      g.addColorStop(1, "rgba(0,0,0,0.98)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
  }
  function render2D(ctx, W, H, F) {
    var field = Model.buildField(F);
    drawStage(ctx, W, H, field.S, field);
    drawDroplets(ctx, W, H, F, field);
    drawBlob(ctx, W, H, F, field);
  }

  var f2 = function (v) { return (+v).toFixed(2); };
  root.Demo = {
    title: "Ferrofluid",
    driver: { x: { src: "sine", rate: 0.45, smooth: 0.25 }, y: { src: "sine", rate: 0.9, phase: 0.2 }, drive: "max" },
    gpu: { init: function (canvas) { return WebGL && WebGL.createRenderer ? WebGL.createRenderer(canvas) : null; } },
    structure: [
      { tier: "structure", key: "stage", label: "Stage", type: "select", value: "aperture", options: [
        { value: "aperture", label: "Aperture" }, { value: "dark", label: "Dark stage" }, { value: "plate", label: "Macro plate" } ] },
      { tier: "structure", key: "blobSize", label: "Blob size", type: "slider", min: 0.38, max: 1.1, step: 0.01, value: 0.76, fmt: f2 },
      { tier: "structure", key: "surfaceTension", label: "Surface tension", type: "slider", min: 0, max: 1, step: 0.01, value: 0.76, fmt: f2 },
      { tier: "structure", key: "droplets", label: "Droplets", type: "slider", min: 0, max: 1, step: 0.01, value: 0.28, fmt: f2 },
      { tier: "structure", key: "seed", label: "Seed", type: "slider", min: 1, max: 999, step: 1, value: 19 }
    ],
    shaping: [
      { tier: "shaping", key: "fieldStrength", label: "Field strength", type: "slider", min: 0, max: 1.5, step: 0.01, value: 0.62, fmt: f2 },
      { tier: "shaping", key: "resonance", label: "Resonance", type: "slider", min: 0, max: 1.5, step: 0.01, value: 0.48, fmt: f2 },
      { tier: "shaping", key: "viscosity", label: "Viscosity", type: "slider", min: 0, max: 1, step: 0.01, value: 0.72, fmt: f2 },
      { tier: "shaping", key: "lobeCount", label: "Lobes", type: "slider", min: 2, max: 12, step: 1, value: 4 },
      { tier: "shaping", key: "reflection", label: "Reflection", type: "slider", min: 0, max: 1.5, step: 0.01, value: 0.92, fmt: f2 },
      { tier: "shaping", key: "accent", label: "Accent", type: "select", value: "none", options: [
        { value: "none", label: "None" }, { value: "magenta", label: "Magenta" }, { value: "amber", label: "Amber" }, { value: "signal", label: "Signal green" } ] },
      { tier: "shaping", key: "spikeThreshold", label: "Spike threshold", type: "slider", min: 0.2, max: 1, step: 0.01, value: 0.9, fmt: f2 }
    ],
    presets: (root.DemoPresets || {}),
    render: render2D
  };
})(typeof self !== "undefined" ? self : this);
```

Create `demos/ferrofluid/README.md`:

```markdown
# Ferrofluid

Signal Rack behaves like a magnetic resonance driver: the waveform becomes a
synthetic magnetic field that pulls a glossy black 2.5D ferrofluid blob into
lobes, dimples, beads, and high-energy spikelets.

The default preset is the blobby aperture look. Dark and high-resonance presets
push toward reflective macro ferrofluid, but this demo does not claim physical
magnetohydrodynamics accuracy.

## Signal Mapping

- `n` controls overall magnetic pull and breathing.
- `bufX` shapes angular lobe pressure around the blob.
- `bufY` adds secondary wobble and bead variation when the combine mode uses it.

## Run

From the repo root:

```bash
python3 -m http.server
# open http://localhost:8000/demos/ferrofluid/
```
```

- [ ] **Step 2: Run syntax checks**

Run:

```powershell
node --check demos/ferrofluid/render.js
node --check demos/ferrofluid/presets.js
```

Expected: both exit `0`.

- [ ] **Step 3: Commit Task 3**

Run:

```powershell
git add demos/ferrofluid/index.html demos/ferrofluid/render.js demos/ferrofluid/presets.js demos/ferrofluid/README.md
git commit -m "feat: add ferrofluid demo module"
```

---

### Task 4: Demo Suite Registration and Docs

**Files:**
- Create: `demos/ferrofluid/integration.test.js`
- Modify: `demos/index.html`
- Modify: `demos/shared/host.js`
- Modify: `demos/README.md`
- Modify: `docs/web-demos/README.md`

- [ ] **Step 1: Write failing integration test**

Create `demos/ferrofluid/integration.test.js`:

```javascript
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }
function exists(p) { return fs.existsSync(path.join(root, p)); }

["index.html", "render.js", "presets.js", "README.md"].forEach((file) => {
  assert.ok(exists(`demos/ferrofluid/${file}`), `missing demos/ferrofluid/${file}`);
});

const launcher = read("demos/index.html");
assert.ok(/dir:"ferrofluid"/.test(launcher), "launcher must include ferrofluid card");
assert.ok(/magnetic resonance/i.test(launcher), "launcher description should position the demo");

const host = read("demos/shared/host.js");
assert.ok(/dir:\s*"ferrofluid"/.test(host), "rail MODULES must include ferrofluid");

const demosReadme = read("demos/README.md");
assert.ok(/Ferrofluid/.test(demosReadme), "demos README must mention Ferrofluid");

const plansReadme = read("docs/web-demos/README.md");
assert.ok(/ferrofluid/i.test(plansReadme), "web demo plans README must mention ferrofluid");

console.log("ferrofluid integration tests passed");
```

- [ ] **Step 2: Run integration test and verify RED**

Run:

```powershell
node demos/ferrofluid/integration.test.js
```

Expected: FAIL with `launcher must include ferrofluid card`.

- [ ] **Step 3: Register Ferrofluid in launcher**

Modify the `DEMOS` array in `demos/index.html` by adding this item after `field-distort`:

```javascript
  { dir:"ferrofluid", name:"Ferrofluid", ready:true, tag:"magnetic resonance",
    desc:"A glossy black ferrofluid blob whose lobes, beads, and spikelets answer the Signal Rack waveform like a magnetic field.",
    sig:{ x:{src:"sine",rate:0.45}, y:{src:"sine",rate:0.9,phase:0.2}, drive:"max" } }
```

- [ ] **Step 4: Register Ferrofluid in the left rail**

Modify `MODULES` in `demos/shared/host.js` by adding:

```javascript
    { dir: "ferrofluid", name: "Ferrofluid" }
```

after the `field-distort` item.

- [ ] **Step 5: Update docs**

Update `demos/README.md`:

- Change "working nine-module suite" to "working ten-module suite".
- Change "links all nine modules" to "links all ten modules".
- Add this row to the Field convergence demos table:

```markdown
| **ferrofluid** | Signal Rack mimics a magnetic resonance field that deforms a reflective black ferrofluid blob. |
```

Update `docs/web-demos/README.md`:

- In the opening paragraph, change "two Etheros convergence demos" to "two Etheros convergence demos plus a ferrofluid resonance demo".
- Add this row to the Convergence demos table:

```markdown
| `ferrofluid` | Signal Rack waveform mimics a magnetic field that drives a reflective blobby ferrofluid height/displacement surface. |
```

- [ ] **Step 6: Run integration checks and verify GREEN**

Run:

```powershell
node demos/ferrofluid/integration.test.js
node --check demos/shared/host.js
```

Expected: both exit `0`; first prints `ferrofluid integration tests passed`.

- [ ] **Step 7: Commit Task 4**

Run:

```powershell
git add demos/index.html demos/shared/host.js demos/README.md docs/web-demos/README.md demos/ferrofluid/integration.test.js
git commit -m "feat: register ferrofluid demo"
```

---

### Task 5: Verification and Visual Smoke

**Files:**
- Modify only if failures reveal a defect in earlier files.

- [ ] **Step 1: Run full static verification**

Run:

```powershell
node demos/shared/ferrofluid-model.test.js
node demos/shared/ferrofluid-webgl.test.js
node demos/ferrofluid/integration.test.js
node --check demos/shared/ferrofluid-model.js
node --check demos/shared/ferrofluid-webgl.js
node --check demos/ferrofluid/render.js
node --check demos/ferrofluid/presets.js
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 2: Run local HTTP smoke**

Start a server from the repo root:

```powershell
python -m http.server 8123
```

Open:

```text
http://127.0.0.1:8123/demos/
http://127.0.0.1:8123/demos/ferrofluid/
```

Expected:

- Launcher loads and shows Ferrofluid.
- Ferrofluid page loads without JavaScript errors.
- Canvas is nonblank and animated.
- Presets switch between Aperture Blob, Black Stage, Magnetic Beads, and High Resonance.
- Signal controls visibly affect blob deformation.

- [ ] **Step 3: Fix any smoke failures**

If a failure appears, fix only the defect found by the smoke check, then re-run Step 1 and the relevant page smoke.

- [ ] **Step 4: Commit verification fixes if needed**

If Step 3 changed files, run:

```powershell
git add <changed-files>
git commit -m "fix: polish ferrofluid demo smoke"
```

If no files changed, do not create a commit.

---

## Self-Review Notes

Spec coverage:

- New `demos/ferrofluid/` module: Task 3.
- Magnetic resonance waveform concept: Task 1 model and Task 3 renderer.
- Blobby default, spikelets as high energy: Task 3 presets and controls.
- 2.5D reflection/displacement: Task 1 surface model and Task 3 shading.
- Structure / Signal / Shaping controls: Task 3.
- Four presets: Task 3.
- Launcher and docs integration: Task 4.
- Fallback behavior: Task 2 and Task 3.
- Verification: Task 5.

Scope controls:

- No true 3D mesh.
- No physical magnetohydrodynamics claim.
- No audio capture or FFT.
- No native Dawn or AE plugin work.
- No broad host refactor.
