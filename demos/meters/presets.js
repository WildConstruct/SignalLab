/* Meters — presets. */
(function (root) {
  root.DemoPresets = {
    "VU Bar":     { driver: { x: { src: "sine", rate: 1 }, y: { src: "noise", rate: 2 }, drive: "max" }, S: { variant: "bar", segs: 16, gamma: 1, redline: 0.85, _src: "sine", _rate: 1, _drive: "max" } },
    "Gauge":      { driver: { x: { src: "sine", rate: 0.8 }, drive: "x" },                               S: { variant: "radial", segs: 16, gamma: 1.2, redline: 0.85, _src: "sine", _rate: 0.8, _drive: "x" } },
    "LED Ladder": { driver: { x: { src: "noise", rate: 3 }, drive: "x" },                                S: { variant: "led", segs: 20, gamma: 0.7, redline: 0.85, _src: "noise", _rate: 3, _drive: "x" } },
    "Smooth":     { driver: { x: { src: "sine", rate: 0.6 }, drive: "x" },                               S: { variant: "bar", segs: 16, gamma: 1.8, redline: 0.9, _src: "sine", _rate: 0.6, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
