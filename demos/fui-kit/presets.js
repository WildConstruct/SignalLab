/* FUI Kit — presets (demos/fui-kit/presets.js). Loaded before render.js. */
(function (root) {
  root.DemoPresets = {
    "Neural Net":   { driver: { x: { src: "sine", rate: 1.5 }, y: { src: "sine", rate: 2, phase: 0.1 }, drive: "mult" },
                      S: { nodes: 15, connect: 2, seed: 1941, fire: 0.45, _src: "sine", _rate: 1.5, _drive: "mult" } },
    "Sparse Mesh":  { driver: { x: { src: "triangle", rate: 0.8 }, drive: "x" },
                      S: { nodes: 9, connect: 1, seed: 4242, fire: 0.6, _src: "triangle", _rate: 0.8, _drive: "x" } },
    "Storm":        { driver: { x: { src: "noise", rate: 3 }, y: { src: "sine", rate: 2.4 }, drive: "max" },
                      S: { nodes: 22, connect: 3, seed: 77, fire: 0.3, _src: "noise", _rate: 3, _drive: "max" } }
  };
})(typeof self !== "undefined" ? self : this);
