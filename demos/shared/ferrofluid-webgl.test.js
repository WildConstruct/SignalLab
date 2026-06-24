"use strict";

const assert = require("assert");
const FerrofluidWebGL = require("./ferrofluid-webgl");

assert.strictEqual(typeof FerrofluidWebGL.createRenderer, "function");

async function run() {
  let renderer = await FerrofluidWebGL.createRenderer(null);
  assert.strictEqual(renderer, null, "null canvas should fall back cleanly");

  renderer = await FerrofluidWebGL.createRenderer({ getContext: () => null });
  assert.strictEqual(renderer, null, "unsupported WebGL should fall back cleanly");

  let getContextCalls = 0;
  const canvas = {
    getContext: (name) => {
      getContextCalls += 1;
      return name === "webgl2" ? {} : null;
    }
  };

  renderer = await FerrofluidWebGL.createRenderer(canvas);
  assert.strictEqual(renderer, null, "first slice should fall back cleanly");
  assert.strictEqual(getContextCalls, 0, "first slice must not claim a WebGL canvas context");

  console.log("ferrofluid-webgl tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
