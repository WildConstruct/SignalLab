/* Particles — presets. */
(function (root) {
  root.DemoPresets = {
    "Fountain":  { driver: { x: { src: "sine", rate: 1.5 }, y: { src: "noise", rate: 3 }, drive: "max" }, S: { rate: 16, spread: 11, _src: "sine", _rate: 1.5, _drive: "max" } },
    "Eruption":  { driver: { x: { src: "noise", rate: 4 }, drive: "x" },                                  S: { rate: 36, spread: 18, _src: "noise", _rate: 4, _drive: "x" } },
    "Drizzle":   { driver: { x: { src: "sine", rate: 0.8 }, drive: "x" },                                 S: { rate: 8, spread: 5, _src: "sine", _rate: 0.8, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
