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
