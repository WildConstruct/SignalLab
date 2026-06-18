/* Glitch / Distortion — presets (demos/glitch-distortion/presets.js). */
(function (root) {
  root.DemoPresets = {
    "Broadcast Sync Drift": { driver: { x: { src: "randomWalk", rate: 1.2 }, y: { src: "sine", rate: 0.6 }, drive: "max" },
                              S: { scan: 3, chroma: 14, drift: 48, _src: "randomWalk", _rate: 1.2, _drive: "max" } },
    "Subtle Chroma":        { driver: { x: { src: "sine", rate: 0.5 }, drive: "x" },
                              S: { scan: 4, chroma: 8, drift: 6, _src: "sine", _rate: 0.5, _drive: "x" } },
    "Hard Corruption":      { driver: { x: { src: "noise", rate: 4 }, y: { src: "pulse", rate: 2 }, drive: "max" },
                              S: { scan: 2, chroma: 32, drift: 110, _src: "noise", _rate: 4, _drive: "max" } }
  };
})(typeof self !== "undefined" ? self : this);
