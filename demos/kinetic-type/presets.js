/* Kinetic Type — presets. */
(function (root) {
  root.DemoPresets = {
    "Title Pump":  { driver: { x: { src: "pulse", rate: 2 }, y: { src: "sine", rate: 2, phase: 0.25 }, drive: "mult" }, S: { word: "SIGNAL RACK", amp: 1, _src: "pulse", _rate: 2, _drive: "mult" } },
    "Gentle Wave": { driver: { x: { src: "sine", rate: 1 }, drive: "x" },                                              S: { word: "WILD CONSTRUCT", amp: 0.7, _src: "sine", _rate: 1, _drive: "x" } },
    "Chaos":       { driver: { x: { src: "noise", rate: 4 }, y: { src: "sine", rate: 3 }, drive: "max" },              S: { word: "GLITCH", amp: 1.8, _src: "noise", _rate: 4, _drive: "max" } }
  };
})(typeof self !== "undefined" ? self : this);
