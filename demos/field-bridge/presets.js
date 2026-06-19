/* Field Bridge — presets. */
(function (root) {
  root.DemoPresets = {
    "Smoke Drift":  { driver: { x: { src: "sine", rate: 0.4 }, drive: "x" },     S: { fractal: "fbm", baseScale: 3.4, octaves: 8, detail: 0.72, seed: 7, palette: "ember", gain: 2.6, contrast: 1.1, tlo: 0.2, evolve: 0.45, flow: 0.14, angle: 90, warpStyle: "curl", warp: 0.35, route: "warp.amount", depth: 0.7, _src: "sine", _rate: 0.4, _drive: "x" } },
    "Energy Veins": { driver: { x: { src: "sine", rate: 0.8 }, y: { src: "noise", rate: 2 }, drive: "max" }, S: { fractal: "ridged", baseScale: 4, octaves: 9, detail: 0.82, seed: 41, palette: "signal", gain: 3.2, contrast: 1.5, tlo: 0.35, evolve: 0.7, flow: 0.3, angle: 60, warpStyle: "curl", warp: 0.5, route: "flowStrength", depth: 0.9, _src: "sine", _rate: 0.8, _drive: "max" } },
    "Breaking Up":  { driver: { x: { src: "triangle", rate: 0.5 }, drive: "x" }, S: { fractal: "turbulence", baseScale: 3.4, octaves: 8, detail: 0.78, seed: 133, palette: "ice", gain: 2.8, contrast: 1.3, tlo: 0.3, evolve: 0.9, flow: 0.1, angle: 120, warpStyle: "organic", warp: 0.2, route: "thresholdLow", depth: 1.0, _src: "triangle", _rate: 0.5, _drive: "x" } },
    "Curl Swirl":   { driver: { x: { src: "sine", rate: 0.3 }, drive: "x" },     S: { fractal: "fbm", baseScale: 2.8, octaves: 7, detail: 0.7, seed: 64, palette: "ember", gain: 2.8, contrast: 1.2, tlo: 0.22, evolve: 0.35, flow: 0.18, angle: 90, warpStyle: "curl", warp: 0.9, route: "flowAngle", depth: 1.0, _src: "sine", _rate: 0.3, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
