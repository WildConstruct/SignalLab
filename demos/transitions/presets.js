/* Transitions — presets. */
(function (root) {
  root.DemoPresets = {
    "Steady Load":  { driver: { x: { src: "sine", rate: 1.2 }, drive: "x" },     S: { variant: "bar", width: 0.7, pace: 0.4, ease: "smooth", _src: "sine", _rate: 1.2, _drive: "x" } },
    "Burst Load":   { driver: { x: { src: "noise", rate: 3 }, drive: "x" },       S: { variant: "bar", width: 0.7, pace: 0.9, ease: "out", _src: "noise", _rate: 3, _drive: "x" } },
    "Wipe Title":   { driver: { x: { src: "sine", rate: 1 }, drive: "x" },        S: { variant: "wipe", width: 0.7, pace: 0.45, ease: "smooth", _src: "sine", _rate: 1, _drive: "x" } },
    "Radial":       { driver: { x: { src: "triangle", rate: 0.8 }, drive: "x" },  S: { variant: "radial", width: 0.7, pace: 0.5, ease: "in", _src: "triangle", _rate: 0.8, _drive: "x" } },
    "Text Reveal":  { driver: { x: { src: "sine", rate: 1.4 }, y: { src: "noise", rate: 2 }, drive: "max" }, S: { variant: "text", width: 0.7, pace: 0.55, ease: "smooth", _src: "sine", _rate: 1.4, _drive: "max" } }
  };
})(typeof self !== "undefined" ? self : this);
