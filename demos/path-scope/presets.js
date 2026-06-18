/* Path & Scope — presets. */
(function (root) {
  root.DemoPresets = {
    "Ring Mod":    { driver: { x: { src: "sine", rate: 3 }, y: { src: "sine", rate: 2, phase: 0.1 }, drive: "mult" }, S: { variant: "wave", turns: 4, radius: 1, weight: 2, _src: "sine", _rate: 3, _drive: "mult" } },
    "Vectorscope": { driver: { x: { src: "sine", rate: 2 }, y: { src: "sine", rate: 3, phase: 0.25 }, drive: "x" },   S: { variant: "vector", turns: 4, radius: 1, weight: 2, _src: "sine", _rate: 2, _drive: "x" } },
    "Spirograph":  { driver: { x: { src: "triangle", rate: 1.5 }, drive: "x" },                                       S: { variant: "spiro", turns: 6, radius: 1, weight: 2, _src: "triangle", _rate: 1.5, _drive: "x" } },
    "Rose":        { driver: { x: { src: "sine", rate: 1 }, drive: "x" },                                             S: { variant: "rose", turns: 5, radius: 1, weight: 2, _src: "sine", _rate: 1, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
