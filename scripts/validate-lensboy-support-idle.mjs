import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const recipePath = path.join(
  root,
  "schemas",
  "examples",
  "18-lensboy-support-idle.json",
);
const recipe = JSON.parse(fs.readFileSync(recipePath, "utf8"));
const require = createRequire(import.meta.url);
const SignalCore = require(path.join(
  root,
  "prototypes",
  "webgpu-lab",
  "signal-core-reference.js",
));

assert.equal(recipe.type, "wildconstruct.signalRecipe");
assert.equal(recipe.id, "sg_support_idle_001");
assert.equal(recipe.rackType, "generator");
assert.deepEqual(Object.keys(recipe.outputs), ["A"]);
assert.equal(recipe.outputs.A.profile, "normalized_0_1");
assert.deepEqual(recipe.outputs.A.range, [0, 1]);
assert.equal(recipe.outputs.A.units, "normalized");
assert.equal(recipe.outputs.A.valueType, "scalar");
assert.equal(recipe.outputs.A.behavior, "continuous");
assert.equal(recipe.outputs.A.deterministic, true);
assert.equal(recipe.outputs.A.memory, "none");
assert.equal(recipe.outputs.A.arbitraryTimeEvaluation, true);
assert.ok(recipe.outputs.A.suggestedDestinations.length >= 3);
assert.ok(recipe.outputs.A.suggestedDestinations.every((value) =>
  value.endsWith(".opacity") && !value.toLowerCase().includes("layer")));
assert.equal(recipe.process.smooth, 0);
assert.equal(recipe.process.lag, 0);
assert.ok(!JSON.stringify(recipe).includes('"geometry"'));

function makeRack() {
  return new SignalCore.Rack({
    id: recipe.id,
    srcType: SignalCore.SOURCE[recipe.source.type],
    rate: recipe.source.rate,
    amount: recipe.source.amount,
    phase: recipe.source.phase,
    offset: recipe.source.offset,
    smooth: recipe.process.smooth,
    seed: recipe.timebase.seed,
    process: recipe.process,
    outputs: {
      A: {
        mode: SignalCore.MODE.normalized,
        min: recipe.outputs.A.range[0],
        max: recipe.outputs.A.range[1],
      },
    },
  });
}

function wgslEquivalentAt(time) {
  const seedPhase = (recipe.timebase.seed * 0.07) % 1;
  const x = time * recipe.source.rate + recipe.source.phase + seedPhase;
  const bipolar = Math.sin(x * Math.PI * 2) * recipe.source.amount;
  const source = Math.min(1, Math.max(0, (bipolar + 1) / 2 + recipe.source.offset));
  return Math.min(1, Math.max(
    0,
    0.5 + (source - 0.5) * recipe.process.gain + recipe.process.bias,
  ));
}

const period = 1 / recipe.source.rate;
const times = Array.from({ length: 4096 }, (_, index) =>
  -period + index * (period * 4 / 4095));
const baselineRack = makeRack();
const baseline = times.map((time) => baselineRack.output("A", time));
let minimum = Infinity;
let maximum = -Infinity;
for (let index = 0; index < times.length; index += 1) {
  const value = baseline[index];
  minimum = Math.min(minimum, value);
  maximum = Math.max(maximum, value);
  assert.ok(value >= 0 && value <= 1);
  assert.ok(Math.abs(value - wgslEquivalentAt(times[index])) <= 1e-12);
}
assert.ok(Math.abs(minimum - 0.41) < 1e-5);
assert.ok(Math.abs(maximum - 0.59) < 1e-5);

const reversedRack = makeRack();
for (let index = times.length - 1; index >= 0; index -= 1) {
  assert.equal(reversedRack.output("A", times[index]), baseline[index]);
}

let state = 0x51a17e;
const permutation = Array.from(times.keys());
for (let index = permutation.length - 1; index > 0; index -= 1) {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  const swap = state % (index + 1);
  [permutation[index], permutation[swap]] = [permutation[swap], permutation[index]];
}
const permutedRack = makeRack();
for (const index of permutation) {
  assert.equal(permutedRack.output("A", times[index]), baseline[index]);
}

console.log(
  `Support Idle S1 validated: ${times.length} arbitrary-time samples, ` +
  `range ${minimum.toFixed(6)}..${maximum.toFixed(6)}, outputs A only.`,
);
