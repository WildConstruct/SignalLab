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
