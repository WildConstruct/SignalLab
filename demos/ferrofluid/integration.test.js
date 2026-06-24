"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }
function exists(p) { return fs.existsSync(path.join(root, p)); }

function loadFerrofluidPresets() {
  const sandbox = { self: {} };
  vm.createContext(sandbox);
  vm.runInContext(read("demos/ferrofluid/presets.js"), sandbox, { filename: "demos/ferrofluid/presets.js" });
  return sandbox.self.DemoPresets;
}

function signalStateFromDriver(driver) {
  return {
    _src: driver.x.src,
    _rate: driver.x.rate,
    _ysrc: driver.y.src,
    _yrate: driver.y.rate,
    _drive: driver.drive,
    _smooth: driver.x.smooth
  };
}

function signalStateFromPresetState(S) {
  return {
    _src: S._src,
    _rate: S._rate,
    _ysrc: S._ysrc,
    _yrate: S._yrate,
    _drive: S._drive,
    _smooth: S._smooth
  };
}

["index.html", "render.js", "presets.js", "README.md"].forEach((file) => {
  assert.ok(exists(`demos/ferrofluid/${file}`), `missing demos/ferrofluid/${file}`);
});

const launcher = read("demos/index.html");
assert.ok(/dir:\s*"ferrofluid"/.test(launcher), "launcher must include ferrofluid card");
assert.ok(/magnetic resonance/i.test(launcher), "launcher description should position the demo");

const host = read("demos/shared/host.js");
assert.ok(/dir:\s*"ferrofluid"/.test(host), "rail MODULES must include ferrofluid");

const demosReadme = read("demos/README.md");
assert.ok(/Ferrofluid/.test(demosReadme), "demos README must mention Ferrofluid");

const plansReadme = read("docs/web-demos/README.md");
assert.ok(/ferrofluid/i.test(plansReadme), "web demo plans README must mention ferrofluid");

const renderSource = read("demos/ferrofluid/render.js");
assert.ok(/createFluidSolver/.test(renderSource), "renderer must use the stateful fluid solver");
assert.ok(/sampleFluidSurface/.test(renderSource), "renderer must shade the displaced fluid field");
assert.ok(!/buildSurfaceActors|drawResonantSpikes|drawSpikeCone|drawSpikeBase/.test(renderSource), "renderer must not use actor/spike primitives");

const presets = loadFerrofluidPresets();
Object.entries(presets).forEach(([name, preset]) => {
  assert.deepStrictEqual(
    signalStateFromPresetState(preset.S),
    signalStateFromDriver(preset.driver),
    `${name} preset S must mirror its driver signal keys`
  );
});

assert.deepStrictEqual(signalStateFromPresetState(presets["High Resonance"].S), {
  _src: "sine",
  _rate: 1.2,
  _ysrc: "triangle",
  _yrate: 1.8,
  _drive: "mult",
  _smooth: 0.08
}, "High Resonance preset S must preserve its signal driver");

console.log("ferrofluid integration tests passed");
