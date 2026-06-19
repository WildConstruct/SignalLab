/* Kinetic Type — presets. */
(function (root) {
  root.DemoPresets = {
    "Kinetic Wave": { driver: { x: { src: "sine", rate: 1.4 }, y: { src: "sine", rate: 2, phase: 0.25 }, drive: "mult" }, S: { variant: "wave", word: "SIGNAL RACK", amp: 1, _src: "sine", _rate: 1.4, _drive: "mult" } },
    "Title Pump":   { driver: { x: { src: "pulse", rate: 2 }, drive: "x" },                                              S: { variant: "pump", word: "SIGNAL", amp: 1, _src: "pulse", _rate: 2, _drive: "x" } },
    "RGB Glitch":   { driver: { x: { src: "noise", rate: 4 }, y: { src: "sine", rate: 3 }, drive: "max" },               S: { variant: "glitch", word: "SIGNAL RACK", amp: 1.2, _src: "noise", _rate: 4, _drive: "max" } },
    "Impact":       { driver: { x: { src: "pulse", rate: 1.5 }, y: { src: "noise", rate: 3 }, drive: "max" },            S: { variant: "shake", word: "IMPACT", amp: 1.4, _src: "pulse", _rate: 1.5, _drive: "max" } },
    "Cascade":      { driver: { x: { src: "sine", rate: 1 }, drive: "x" },                                             S: { variant: "cascade", word: "ANIMATE IN", amp: 1, ease: "back", _src: "sine", _rate: 1, _drive: "x" } },
    "3D Fly-in":    { driver: { x: { src: "sine", rate: 0.8 }, drive: "x" },                                           S: { variant: "text3d", word: "SIGNAL RACK", pace: 0.6, zrate: 0.6, zamt: 1.2, rotrate: 0.4, rotamt: 0.5, _src: "sine", _rate: 0.8, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
