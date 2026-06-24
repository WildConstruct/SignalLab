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
