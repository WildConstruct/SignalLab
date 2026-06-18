/* Particles — presets. */
(function (root) {
  root.DemoPresets = {
    "Fountain":  { driver: { x: { src: "sine", rate: 1.5 }, y: { src: "noise", rate: 3 }, drive: "max" }, S: { variant: "fountain", rate: 16, spread: 11, burst: 0.5, _src: "sine", _rate: 1.5, _drive: "max" } },
    "Eruption":  { driver: { x: { src: "noise", rate: 4 }, drive: "x" },                                  S: { variant: "fountain", rate: 36, spread: 18, burst: 0.5, _src: "noise", _rate: 4, _drive: "x" } },
    "Shockwave": { driver: { x: { src: "pulse", rate: 1.2 }, y: { src: "noise", rate: 3 }, drive: "max" }, S: { variant: "rings", rate: 16, spread: 11, burst: 0.45, _src: "pulse", _rate: 1.2, _drive: "max" } },
    "Data Stream":{ driver: { x: { src: "sine", rate: 2 }, y: { src: "noise", rate: 4 }, drive: "max" },   S: { variant: "stream", rate: 30, spread: 11, burst: 0.5, _src: "sine", _rate: 2, _drive: "max" } }
  };
})(typeof self !== "undefined" ? self : this);
