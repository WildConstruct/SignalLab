/* FUI Kit — presets (demos/fui-kit/presets.js). Loaded before render.js.
   Each preset carries the keys for its widget; unused keys are harmless. */
(function (root) {
  root.DemoPresets = {
    "Neural Net":  { driver: { x: { src: "sine", rate: 1.5 }, y: { src: "sine", rate: 2, phase: 0.1 }, drive: "mult" },
                     S: { widget: "synapse", nodes: 15, connect: 2, seed: 1941, fire: 0.45, field: "stagger", propag: 0.6, seq: 0, _src: "sine", _rate: 1.5, _drive: "mult" } },
    "Sparse Mesh": { driver: { x: { src: "triangle", rate: 0.8 }, drive: "x" },
                     S: { widget: "synapse", nodes: 9, connect: 1, seed: 4242, fire: 0.6, field: "stagger", propag: 0.4, seq: 0.4, _src: "triangle", _rate: 0.8, _drive: "x" } },
    "Data Bus":    { driver: { x: { src: "sine", rate: 1.2 }, y: { src: "triangle", rate: 0.7 }, drive: "mix" },
                     S: { widget: "packets", lanes: 6, seed: 88, fire: 0.5, density: 0.45, field: "sweep", _src: "sine", _rate: 1.2, _drive: "mix" } },
    "Processor":   { driver: { x: { src: "noise", rate: 3 }, y: { src: "sine", rate: 2 }, drive: "mix" },
                     S: { widget: "core", cols: 10, rows: 7, seed: 1337, fire: 0.5, field: "stagger", _src: "noise", _rate: 3, _drive: "mix" } },
    "Equalizer":   { driver: { x: { src: "sine", rate: 1.5 }, y: { src: "sine", rate: 2, phase: 0.2 }, drive: "mult" },
                     S: { widget: "equalizer", bands: 28, seed: 7, fire: 0.2, field: "sweep", _src: "sine", _rate: 1.5, _drive: "mult" } },
    "Radar":       { driver: { x: { src: "randomWalk", rate: 1 }, y: { src: "noise", rate: 2 }, drive: "max" },
                     S: { widget: "radar", blips: 14, seed: 23, fire: 0.4, sweep: 0.8, field: "stagger", _src: "randomWalk", _rate: 1, _drive: "max" } },
    "Telemetry":   { driver: { x: { src: "sine", rate: 1 }, y: { src: "noise", rate: 2.5 }, drive: "max" },
                     S: { widget: "telemetry", lines: 8, lineh: 30, seed: 51, fire: 0.6, field: "sweep", _src: "sine", _rate: 1, _drive: "max" } },
    "Die (3D)":    { driver: { x: { src: "sine", rate: 1.4 }, y: { src: "sine", rate: 2, phase: 0.15 }, drive: "mult" },
                     S: { widget: "die3d", cols: 8, rows: 6, cell: 30, depth: 6, seed: 1337, fire: 0.45, field: "stagger", _src: "sine", _rate: 1.4, _drive: "mult" } }
  };
})(typeof self !== "undefined" ? self : this);
