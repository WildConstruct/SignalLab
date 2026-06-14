/*
 * cathode-crt.js — Cathode-modeled NTSC / CRT screen, as a REAL WebGPU pass.
 * -------------------------------------------------------------------------
 * Runs on the same WebGPU device as the signal engine. The 2D scope canvas is
 * uploaded to a texture each frame and a fullscreen fragment shader applies the
 * CRT/NTSC treatment, modeled on Cathode (WildConstruct/cathode):
 *   composite_decode.wgsl  -> NTSC chroma bleed / dot crawl
 *   crt_mask_beam.wgsl     -> aperture-grille mask, scanlines, beam bloom
 * This is a faithful model, not the Cathode library; swap in the real WGSL
 * (paste/vendor) for exactness. On/off; intensity baked toward a fixed look.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CathodeCRT = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var WGSL = `
struct U { res : vec2<f32>, time : f32, intensity : f32, };
@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var tex  : texture_2d<f32>;
@group(0) @binding(2) var<uniform> u : U;

struct VsOut { @builtin(position) pos : vec4<f32>, @location(0) uv : vec2<f32>, };
@vertex fn vs(@builtin(vertex_index) vid : u32) -> VsOut {
  var p = array<vec2<f32>,3>(vec2<f32>(-1.,-1.), vec2<f32>(3.,-1.), vec2<f32>(-1.,3.));
  var o : VsOut;
  o.pos = vec4<f32>(p[vid], 0., 1.);
  o.uv  = vec2<f32>((p[vid].x + 1.) * 0.5, 0.5 - p[vid].y * 0.5);
  return o;
}

fn samp3(uv : vec2<f32>) -> vec3<f32> { return textureSample(tex, samp, uv).rgb; }

@fragment fn fs(in : VsOut) -> @location(0) vec4<f32> {
  let uv = in.uv;
  let px = 1.0 / u.res;
  let amt = u.intensity;

  // NTSC chroma bleed: shift R/B horizontally (dot-crawl feel)
  let sh = px.x * (1.5 + 1.5);
  var col = vec3<f32>(samp3(uv + vec2<f32>(sh, 0.)).r, samp3(uv).g, samp3(uv - vec2<f32>(sh, 0.)).b);

  // beam bloom: small additive blur of bright parts
  var bloom = vec3<f32>(0.);
  let k = px * 2.2;
  bloom = bloom + samp3(uv + vec2<f32>( k.x, 0.));
  bloom = bloom + samp3(uv + vec2<f32>(-k.x, 0.));
  bloom = bloom + samp3(uv + vec2<f32>(0.,  k.y));
  bloom = bloom + samp3(uv + vec2<f32>(0., -k.y));
  bloom = bloom * 0.25;
  bloom = max(bloom - 0.25, vec3<f32>(0.)) * 1.6;

  // aperture grille (RGB triad by device column)
  let colx = u32(floor(in.pos.x)) % 3u;
  var mask = vec3<f32>(0.35, 0.35, 0.35);
  if (colx == 0u) { mask.r = 1.0; } else if (colx == 1u) { mask.g = 1.0; } else { mask.b = 1.0; }

  // scanline (~3px period)
  let scan = 0.78 + 0.22 * sin(in.pos.y * 3.14159265 / 1.5);

  col = col * mix(vec3<f32>(1.), mask, amt * 0.55);
  col = col * mix(1.0, scan, amt * 0.6);
  col = col + bloom * amt * 0.7;

  // slight RF shimmer
  let n = fract(sin(dot(in.pos.xy + vec2<f32>(u.time * 60.0, 0.0), vec2<f32>(12.9898, 78.233))) * 43758.5453);
  col = col + (n - 0.5) * 0.03 * amt;

  // vignette / tube falloff
  let d = distance(uv, vec2<f32>(0.5));
  let vig = smoothstep(0.9, 0.35, d);
  col = col * mix(1.0, vig, amt * 0.85);

  return vec4<f32>(col, 1.0);
}`;

  function create(device, dstCanvas) {
    var ctx = dstCanvas.getContext("webgpu");
    if (!ctx) return null;
    var format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device: device, format: format, alphaMode: "opaque" });
    var module = device.createShaderModule({ code: WGSL });
    var pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: module, entryPoint: "vs" },
      fragment: { module: module, entryPoint: "fs", targets: [{ format: format }] },
      primitive: { topology: "triangle-list" },
    });
    var sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
    var ubuf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    var tex = null, tw = 0, th = 0, bind = null;

    function ensureTex(w, h) {
      if (tex && tw === w && th === h) return;
      tw = w; th = h; if (tex && tex.destroy) tex.destroy();
      tex = device.createTexture({
        size: [w, h], format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
      bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: tex.createView() },
        { binding: 2, resource: { buffer: ubuf } },
      ]});
    }

    function render(src, t, intensity) {
      var w = src.width, h = src.height; if (w < 2 || h < 2) return;
      ensureTex(w, h);
      device.queue.copyExternalImageToTexture({ source: src }, { texture: tex }, [w, h]);
      device.queue.writeBuffer(ubuf, 0, new Float32Array([w, h, t, intensity]));
      var enc = device.createCommandEncoder();
      var pass = enc.beginRenderPass({ colorAttachments: [{
        view: ctx.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store",
        clearValue: { r: 0, g: 0, b: 0, a: 1 } }]});
      pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.draw(3); pass.end();
      device.queue.submit([enc.finish()]);
    }
    return { render: render };
  }
  return { create: create };
});
