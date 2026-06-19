/* Particles — presets. */
(function (root) {
  root.DemoPresets = {
    "Fountain":  { driver: { x: { src: "sine", rate: 1.5 }, y: { src: "noise", rate: 3 }, drive: "max" }, S: { variant: "fountain", rate: 16, spread: 11, burst: 0.5, _src: "sine", _rate: 1.5, _drive: "max" } },
    "Eruption":  { driver: { x: { src: "noise", rate: 4 }, drive: "x" },                                  S: { variant: "fountain", rate: 36, spread: 18, burst: 0.5, _src: "noise", _rate: 4, _drive: "x" } },
    "Shockwave": { driver: { x: { src: "pulse", rate: 1.2 }, y: { src: "noise", rate: 3 }, drive: "max" }, S: { variant: "rings", rate: 16, spread: 11, burst: 0.45, _src: "pulse", _rate: 1.2, _drive: "max" } },
    "Data Stream":{ driver: { x: { src: "sine", rate: 2 }, y: { src: "noise", rate: 4 }, drive: "max" },   S: { variant: "stream", rate: 30, spread: 11, burst: 0.5, _src: "sine", _rate: 2, _drive: "max" } },
    "Flow Field": { driver: { x: { src: "sine", rate: 0.6 }, y: { src: "noise", rate: 2 }, drive: "max" }, S: { variant: "flow", rate: 22, ftype: "curl", fscale: 1.4, fstr: 1.6, _src: "sine", _rate: 0.6, _drive: "max" } },
    "Vortex":     { driver: { x: { src: "sine", rate: 0.8 }, drive: "x" },                                 S: { variant: "flow", rate: 26, ftype: "vortex", fscale: 1.4, fstr: 2.2, _src: "sine", _rate: 0.8, _drive: "x" } }
  };
})(typeof self !== "undefined" ? self : this);
