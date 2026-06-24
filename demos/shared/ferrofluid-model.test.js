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

function controls(overrides) {
  return Object.assign({}, frame().S, overrides || {});
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

assert.strictEqual(typeof FerrofluidModel.buildSurfaceActors, "function", "model exposes animated surface actors");

const activeFrame = frame({
  t: 2.5,
  n: 0.82,
  S: controls({ fieldStrength: 1, resonance: 1, surfaceTension: 0.34, lobeCount: 9, spikeThreshold: 0.58 })
});
const activeField = FerrofluidModel.buildField(activeFrame);
const activeActors = FerrofluidModel.buildSurfaceActors(activeFrame, activeField);
assert.ok(activeActors.core.rx > 0.2 && activeActors.core.ry > 0.15, "core actor has visible size");
assert.ok(activeActors.spikes.length >= activeField.lobes.length * 2, "high resonance creates a dense multi-ring spike field");
assert.ok(activeActors.spikes.every((spike) => {
  return Number.isFinite(spike.x) &&
    Number.isFinite(spike.y) &&
    Number.isFinite(spike.tipX) &&
    Number.isFinite(spike.tipY) &&
    spike.baseRadius > 0 &&
    spike.length > 0 &&
    spike.energy >= 0 &&
    spike.energy <= 1.6;
}), "spike actors are finite and bounded enough to render");

const laterFrame = frame(Object.assign({}, activeFrame, { t: 3.15 }));
const laterActors = FerrofluidModel.buildSurfaceActors(laterFrame, FerrofluidModel.buildField(laterFrame));
const averageTravel = activeActors.spikes.reduce((sum, spike, index) => {
  const later = laterActors.spikes[index];
  const dx = later.tipX - spike.tipX;
  const dy = later.tipY - spike.tipY;
  return sum + Math.sqrt(dx * dx + dy * dy);
}, 0) / activeActors.spikes.length;
assert.ok(averageTravel > 0.02, "animated actors visibly travel over time");

const quietFrame = frame({ n: 0.08, S: controls({ fieldStrength: 0.42, resonance: 0.2, spikeThreshold: 0.7 }) });
const loudFrame = frame({ n: 0.96, S: controls({ fieldStrength: 1, resonance: 1, spikeThreshold: 0.55 }) });
const quietActors = FerrofluidModel.buildSurfaceActors(quietFrame, FerrofluidModel.buildField(quietFrame));
const loudActors = FerrofluidModel.buildSurfaceActors(loudFrame, FerrofluidModel.buildField(loudFrame));
const quietHeight = Math.max.apply(null, quietActors.spikes.map((spike) => spike.length));
const loudHeight = Math.max.apply(null, loudActors.spikes.map((spike) => spike.length));
assert.ok(loudHeight > quietHeight + 0.08, "high resonance creates visibly taller spikes");

console.log("ferrofluid-model tests passed");
