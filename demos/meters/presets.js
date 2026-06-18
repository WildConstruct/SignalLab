/* Meters — presets. */
(function (root) {
  root.DemoPresets = {
    "VU":        { driver: { x: { src: "sine", rate: 1 }, y: { src: "noise", rate: 2 }, drive: "max" }, S: { gamma: 1, redline: 0.85, _src: "sine", _rate: 1, _drive: "max" } },
    "Hot":       { driver: { x: { src: "noise", rate: 3 }, drive: "x" },                                S: { gamma: 0.6, redline: 0.75, _src: "noise", _rate: 3, _drive: "x" } },
    "Smooth":    { driver: { x: { src: "sine", rate: 0.6 }, drive: "x" },                               S: { gamma: 1.8, redline: 0.9, _src: "sine", _rate: 0.6, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
