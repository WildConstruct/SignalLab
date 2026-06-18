/* Path & Scope — presets. */
(function (root) {
  root.DemoPresets = {
    "Ring Mod":   { driver: { x: { src: "sine", rate: 3 }, y: { src: "sine", rate: 2, phase: 0.1 }, drive: "mult" }, S: { weight: 2, _src: "sine", _rate: 3, _drive: "mult" } },
    "Difference": { driver: { x: { src: "triangle", rate: 2 }, y: { src: "sine", rate: 3 }, drive: "diff" },         S: { weight: 2.5, _src: "triangle", _rate: 2, _drive: "diff" } },
    "Noise Floor":{ driver: { x: { src: "noise", rate: 2 }, drive: "x" },                                            S: { weight: 1.5, _src: "noise", _rate: 2, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
