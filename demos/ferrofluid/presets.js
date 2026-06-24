(function (root) {
  "use strict";
  root.DemoPresets = {
    "Aperture Blob": {
      driver: { x: { src: "sine", rate: 0.45, smooth: 0.25 }, y: { src: "sine", rate: 0.9, phase: 0.2 }, drive: "max" },
      S: { stage: "aperture", blobSize: 0.76, surfaceTension: 0.76, droplets: 0.28, seed: 19,
        _src: "sine", _rate: 0.45, _ysrc: "sine", _yrate: 0.9, _drive: "max", _smooth: 0.25, _speed: 1,
        fieldStrength: 0.62, resonance: 0.48, viscosity: 0.72, lobeCount: 4, reflection: 0.92, accent: "none", spikeThreshold: 0.9 }
    },
    "Black Stage": {
      driver: { x: { src: "randomWalk", rate: 0.7, smooth: 0.45 }, y: { src: "sine", rate: 1.3, phase: 0.15 }, drive: "mix" },
      S: { stage: "dark", blobSize: 0.84, surfaceTension: 0.62, droplets: 0.35, seed: 37,
        _src: "randomWalk", _rate: 0.7, _ysrc: "sine", _yrate: 1.3, _drive: "mix", _smooth: 0.45, _speed: 1,
        fieldStrength: 0.72, resonance: 0.68, viscosity: 0.56, lobeCount: 5, reflection: 0.98, accent: "magenta", spikeThreshold: 0.84 }
    },
    "Magnetic Beads": {
      driver: { x: { src: "sine", rate: 0.85, smooth: 0.18 }, y: { src: "noise", rate: 2.2 }, drive: "max" },
      S: { stage: "aperture", blobSize: 0.68, surfaceTension: 0.58, droplets: 0.78, seed: 71,
        _src: "sine", _rate: 0.85, _ysrc: "noise", _yrate: 2.2, _drive: "max", _smooth: 0.18, _speed: 1,
        fieldStrength: 0.8, resonance: 0.72, viscosity: 0.48, lobeCount: 6, reflection: 0.96, accent: "amber", spikeThreshold: 0.82 }
    },
    "High Resonance": {
      driver: { x: { src: "sine", rate: 1.2, smooth: 0.08 }, y: { src: "triangle", rate: 1.8, phase: 0.25 }, drive: "mult" },
      S: { stage: "dark", blobSize: 0.82, surfaceTension: 0.46, droplets: 0.48, seed: 94,
        _src: "sine", _rate: 1.2, _ysrc: "triangle", _yrate: 1.8, _drive: "mult", _smooth: 0.08, _speed: 1,
        fieldStrength: 1, resonance: 1, viscosity: 0.34, lobeCount: 9, reflection: 1, accent: "signal", spikeThreshold: 0.64 }
    }
  };
})(typeof self !== "undefined" ? self : this);
