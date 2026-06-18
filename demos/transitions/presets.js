/* Transitions — presets. */
(function (root) {
  root.DemoPresets = {
    "Steady Load":   { driver: { x: { src: "sine", rate: 1.2 }, drive: "x" },     S: { width: 0.7, pace: 0.4, _src: "sine", _rate: 1.2, _drive: "x" } },
    "Burst Load":    { driver: { x: { src: "noise", rate: 3 }, drive: "x" },       S: { width: 0.7, pace: 0.9, _src: "noise", _rate: 3, _drive: "x" } },
    "Slow Reveal":   { driver: { x: { src: "triangle", rate: 0.6 }, drive: "x" },  S: { width: 0.5, pace: 0.25, _src: "triangle", _rate: 0.6, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
