/* Field Bridge — presets. */
(function (root) {
  root.DemoPresets = {
    "Smoke Drift":  { driver: { x: { src: "sine", rate: 0.4 }, drive: "x" },     S: { fractal: "fbm", baseScale: 3, octaves: 5, seed: 7, contrast: 1.1, tlo: 0.2, warp: 0.3, flow: 0.4, route: "warp.amount", depth: 0.7, _src: "sine", _rate: 0.4, _drive: "x" } },
    "Energy Veins": { driver: { x: { src: "sine", rate: 0.8 }, y: { src: "noise", rate: 2 }, drive: "max" }, S: { fractal: "ridged", baseScale: 4, octaves: 6, seed: 41, contrast: 1.5, tlo: 0.35, warp: 0.5, flow: 0.6, route: "flowStrength", depth: 0.9, _src: "sine", _rate: 0.8, _drive: "max" } },
    "Breaking Up":  { driver: { x: { src: "triangle", rate: 0.5 }, drive: "x" }, S: { fractal: "turbulence", baseScale: 3.4, octaves: 6, seed: 133, contrast: 1.3, tlo: 0.3, warp: 0.2, flow: 0.1, route: "thresholdLow", depth: 1.0, _src: "triangle", _rate: 0.5, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
