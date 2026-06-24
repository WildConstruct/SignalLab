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

const nonFiniteTimeField = FerrofluidModel.buildField(frame({ t: Infinity }));
assert.ok(nonFiniteTimeField.lobes.every((lobe) => {
  return Number.isFinite(lobe.angle) &&
    Number.isFinite(lobe.x) &&
    Number.isFinite(lobe.y) &&
    Math.abs(lobe.x) <= 1 &&
    Math.abs(lobe.y) <= 1 &&
    lobe.radius >= 0 &&
    lobe.radius <= 1 &&
    lobe.amp >= 0 &&
    lobe.amp <= 1 &&
    lobe.pressure >= 0 &&
    lobe.pressure <= 1.5;
}), "non-finite time should produce finite bounded lobes");

const nonFiniteTimeDroplets = FerrofluidModel.buildDroplets(frame({ t: Infinity }), nonFiniteTimeField);
assert.ok(nonFiniteTimeDroplets.every((droplet) => {
  return Number.isFinite(droplet.x) &&
    Number.isFinite(droplet.y) &&
    Number.isFinite(droplet.r) &&
    Math.abs(droplet.x) <= 1.2 &&
    Math.abs(droplet.y) <= 1.2 &&
    droplet.r > 0 &&
    droplet.r < 0.08;
}), "non-finite time should produce finite bounded droplets");

assert.strictEqual(typeof FerrofluidModel.createFluidSolver, "function", "model exposes a stateful fluid solver");
assert.strictEqual(FerrofluidModel.buildSurfaceActors, undefined, "model should not expose actor primitives for ferrofluid motion");

const quietSolver = FerrofluidModel.createFluidSolver(36, 28);
const loudSolver = FerrofluidModel.createFluidSolver(36, 28);
let quietSnapshot = null;
let loudSnapshot = null;
for (let i = 0; i < 8; i++) {
  quietSnapshot = quietSolver.step(frame({ t: i / 30, n: 0.12, x: 0.12, y: 0.18 }));
  loudSnapshot = loudSolver.step(frame({ t: i / 30, n: 0.92, x: 0.92, y: 0.84, S: Object.assign({}, frame().S, {
    fieldStrength: 1,
    resonance: 1,
    surfaceTension: 0.32,
    viscosity: 0.28,
    lobeCount: 10,
    spikeThreshold: 0.56
  }) }));
}

assert.strictEqual(loudSnapshot.width, 36);
assert.strictEqual(loudSnapshot.height, 28);
assert.strictEqual(loudSnapshot.heightField.length, 36 * 28, "height field covers solver grid");
assert.strictEqual(loudSnapshot.velocityX.length, 36 * 28, "velocity field covers solver grid");
assert.ok(loudSnapshot.stats.mass > 0.01, "fluid surface has displaced mass");
assert.ok(loudSnapshot.stats.velocityEnergy > 0.0001, "signal injects velocity into the field");
assert.ok(loudSnapshot.stats.maxHeight > quietSnapshot.stats.maxHeight + 0.04, "high resonance lifts the displaced fluid field");
assert.ok(loudSnapshot.stats.curlEnergy > quietSnapshot.stats.curlEnergy, "high resonance adds more rotational field motion");

const sampleA = FerrofluidModel.sampleFluidSurface(loudSnapshot, 0, 0);
const sampleB = FerrofluidModel.sampleFluidSurface(loudSnapshot, 0.18, -0.12);
assert.ok(sampleA.height >= 0 && sampleA.mask >= 0 && sampleA.mask <= 1, "fluid surface sample is bounded");
assert.ok(Array.isArray(sampleA.normal) && sampleA.normal.length === 3, "fluid surface sample exposes normals");
assert.notStrictEqual(sampleA.height, sampleB.height, "fluid surface samples vary across the displaced field");

console.log("ferrofluid-model tests passed");
