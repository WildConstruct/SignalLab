/* FUI Kit — presets (demos/fui-kit/presets.js). Loaded before render.js. */
(function (root) {
  root.DemoPresets = {
    "Neural Net":   { driver: { x: { src: "sine", rate: 1.5 }, y: { src: "sine", rate: 2, phase: 0.1 }, drive: "mult" },
                      S: { widget: "synapse", nodes: 15, connect: 2, seed: 1941, fire: 0.45, _src: "sine", _rate: 1.5, _drive: "mult" } },
    "Sparse Mesh":  { driver: { x: { src: "triangle", rate: 0.8 }, drive: "x" },
                      S: { widget: "synapse", nodes: 9, connect: 1, seed: 4242, fire: 0.6, _src: "triangle", _rate: 0.8, _drive: "x" } },
    "Data Bus":     { driver: { x: { src: "noise", rate: 2.5 }, y: { src: "sine", rate: 1.5 }, drive: "max" },
                      S: { widget: "packets", nodes: 15, connect: 2, seed: 88, fire: 0.4, _src: "noise", _rate: 2.5, _drive: "max" } },
    "Processor":    { driver: { x: { src: "noise", rate: 3 }, y: { src: "sine", rate: 2 }, drive: "mix" },
                      S: { widget: "core", nodes: 15, connect: 2, seed: 1337, fire: 0.5, _src: "noise", _rate: 3, _drive: "mix" } },
    "Equalizer":    { driver: { x: { src: "sine", rate: 1.5 }, y: { src: "sine", rate: 2, phase: 0.2 }, drive: "mult" },
                      S: { widget: "equalizer", nodes: 16, connect: 2, seed: 7, fire: 0.2, field: "sweep", _src: "sine", _rate: 1.5, _drive: "mult" } },
    "Radar":        { driver: { x: { src: "randomWalk", rate: 1 }, y: { src: "noise", rate: 2 }, drive: "max" },
                      S: { widget: "radar", nodes: 14, connect: 2, seed: 23, fire: 0.4, propag: 0.8, field: "stagger", _src: "randomWalk", _rate: 1, _drive: "max" } }
  };
})(typeof self !== "undefined" ? self : this);
