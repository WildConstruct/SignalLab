/* Field Distort — presets. */
(function (root) {
  root.DemoPresets = {
    "Film Burn":     { driver: { x: { src: "sine", rate: 0.25 }, drive: "x" }, S: { plate: "type", fractal: "fbm", scale: 2.2, octaves: 3, seed: 7, amount: 1.4, chroma: 2.4, heat: 1.2, drift: 0.18, _src: "sine", _rate: 0.25, _drive: "x" } },
    "Sensor Glitch": { driver: { x: { src: "pulse", rate: 1.2 }, y: { src: "noise", rate: 3 }, drive: "max" }, S: { plate: "reticle", fractal: "turbulence", scale: 3.4, octaves: 4, seed: 23, amount: 1.8, chroma: 3.2, heat: 0.4, drift: 0.4, _src: "pulse", _rate: 1.2, _drive: "max" } },
    "Heat Haze":     { driver: { x: { src: "sine", rate: 0.4 }, drive: "x" }, S: { plate: "grid", fractal: "fbm", scale: 2, octaves: 2, seed: 91, amount: 0.8, chroma: 0.6, heat: 1.6, drift: 0.22, _src: "sine", _rate: 0.4, _drive: "x" } },
    "Warp Rings":    { driver: { x: { src: "triangle", rate: 0.6 }, drive: "x" }, S: { plate: "rings", fractal: "ridged", scale: 3, octaves: 3, seed: 50, amount: 2.2, chroma: 1.0, heat: 0.2, drift: 0.3, _src: "triangle", _rate: 0.6, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
