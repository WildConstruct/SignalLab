/*
 * cathode-crt.js — REAL Cathode NTSC/CRT pipeline (WebGPU), first Signal Rack ↔
 * Cathode interop.
 * -------------------------------------------------------------------------
 * Runs Cathode's ACTUAL vendored WGSL on the engine's WebGPU device:
 *   vendor/cathode/src/shaders/signal/composite_decode.wgsl   (NTSC decode)
 *   vendor/cathode/src/shaders/display/crt_mask_beam.wgsl      (CRT mask/beam)
 *   + lib/math_utils.wgsl, lib/noise_utils.wgsl                (#include'd)
 *
 * Pipeline per frame:  scope 2D canvas
 *   -> texScope (upload) -> [signal compute] -> texSig
 *   -> [display compute] -> texDisp -> [blit] -> CRT canvas
 *
 * Uniform blocks mirror Cathode's C++ exactly (CathodeSignalUniformBlock 64B,
 * CathodeDisplayUniformBlock 256B) seeded with the BroadcastCrt preset defaults
 * from cathode_render_types.h. Glitch suite is off; temporal/history disabled
 * (no feedback textures wired yet). On/off only — not tunable.
 *
 * NOTE: composite_decode uses textureLoad only (no sampler); crt_mask_beam uses
 * textureSampleLevel (+samplers) and a displayMask texture (disabled via flags).
 * Both are @compute @workgroup_size(8,8,1) writing rgba8unorm storage.
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CathodeCRT = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Blit + feathered additive bloom: spreads bright phosphor outward as a soft
  // halo (screen blend) so the CRT "feels like light" instead of fattening lines.
  var BLIT = `
@group(0) @binding(0) var s : sampler;
@group(0) @binding(1) var tex : texture_2d<f32>;
struct V { @builtin(position) pos : vec4<f32>, @location(0) uv : vec2<f32>, };
@vertex fn vs(@builtin(vertex_index) i : u32) -> V {
  var p = array<vec2<f32>,3>(vec2<f32>(-1.,-1.), vec2<f32>(3.,-1.), vec2<f32>(-1.,3.));
  var o : V; o.pos = vec4<f32>(p[i], 0., 1.);
  o.uv = vec2<f32>((p[i].x + 1.) * 0.5, 0.5 - p[i].y * 0.5);
  return o;
}
fn bright(uv : vec2<f32>) -> vec3<f32> {
  let c = textureSampleLevel(tex, s, uv, 0.0).rgb;
  return max(c - vec3<f32>(0.40), vec3<f32>(0.0));
}
@fragment fn fs(in : V) -> @location(0) vec4<f32> {
  let texel = 1.0 / vec2<f32>(textureDimensions(tex));
  let base = textureSampleLevel(tex, s, in.uv, 0.0).rgb;
  let TAU = 6.28318530718;
  var bloom = bright(in.uv) * 0.6;
  for (var k : i32 = 0; k < 8; k = k + 1) {                 // inner ring (tight halo)
    let a = TAU * f32(k) / 8.0;
    bloom = bloom + bright(in.uv + vec2<f32>(cos(a), sin(a)) * texel * 3.0) * 0.46;
  }
  for (var k2 : i32 = 0; k2 < 8; k2 = k2 + 1) {             // outer ring (feathered)
    let a = TAU * (f32(k2) + 0.5) / 8.0;
    bloom = bloom + bright(in.uv + vec2<f32>(cos(a), sin(a)) * texel * 8.0) * 0.26;
  }
  bloom = bloom / 6.0;
  let tint = vec3<f32>(1.0, 0.97, 0.92);
  let lit = 1.0 - (1.0 - base) * (1.0 - clamp(bloom * tint * 1.6, vec3<f32>(0.0), vec3<f32>(1.0)));
  return vec4<f32>(lit, 1.0);
}`;

  function create(device, dstCanvas) {
    var ctx = dstCanvas.getContext("webgpu");
    if (!ctx) return null;
    var format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device: device, format: format, alphaMode: "opaque" });

    var ready = false, failed = false;
    var sigPipe, dispPipe, blitPipe, sampler, dummyTex, sigUBuf, dispUBuf;
    var texScope, texSig, texDisp, W = 0, H = 0;

    // --- uniform blocks (BroadcastCrt defaults from cathode_render_types.h) ---
    var sigBuf = new ArrayBuffer(64), sU = new Uint32Array(sigBuf), sF = new Float32Array(sigBuf);
    // signal0: bandwidth, dotCrawl, enable, hasHistory
    sF[4] = 0.62; sF[5] = 0.20; sF[6] = 1.0; sF[7] = 0.0;
    // signal1: chromaLag, chromaNoise, signalFlavor(Composite=0), componentMode
    sF[8] = 0.0; sF[9] = 0.0; sF[10] = 0.0; sF[11] = 0.0;
    // signal2: chromaSmearAmount, chromaSmearWidth, signalClip, signalRinging
    sF[12] = 0.0; sF[13] = 0.35; sF[14] = 0.0; sF[15] = 0.0;

    var dispBuf = new ArrayBuffer(256), dU = new Uint32Array(dispBuf), dF = new Float32Array(dispBuf);
    dF[4] = 0.92; dF[5] = 0.9; dF[6] = 0.9; dF[7] = 0.16;           // display0: amount, beamSharpness, maskStrength, bloom (kept low; feathered glow added in blit)
    dF[8] = 0.84; dF[9] = 0.58; dF[10] = 0.42; dF[11] = 0.18;       // display1: scanStrength, scanDensity, scanSoftness, persistence
    dF[12] = 0.1; dF[13] = 1.0; dF[14] = 1.0; dF[15] = 1.0;         // display2: curvature, maskPitch/pixelSize, enable, pixelSize
    // personality0..3 (16..31) = 0 -> neutral grading
    dF[32] = 0.0; dF[33] = 0.35; dF[34] = 0.0; dF[35] = 0.35;       // glitch0
    dF[36] = 0.0; dF[37] = 0.0; dF[38] = 0.0; dF[39] = 0.35;        // glitch1
    dF[40] = 8.0; dF[41] = 0.0; dF[42] = 0.35; dF[43] = 0.0;        // glitch2 (posterizeBits=8 -> off)
    dF[44] = 0.0; dF[45] = 0.35; dF[46] = 0.35; dF[47] = 0.35;      // glitch3
    dF[48] = 0.0; dF[49] = 0.0; dF[50] = 0.35; dF[51] = 0.0;        // glitch4
    dF[52] = 0.0; dF[53] = 0.35; dF[54] = 0.0; dF[55] = 0.35;       // glitch5
    dF[56] = 0.0; dF[57] = 0.0; dF[58] = 0.0; dF[59] = 0.0;         // glitch6
    dU[60] = 0; dU[61] = 0; dU[62] = 0; dU[63] = 0;                 // flags0: maskMode=aperture, noMask, noHistory, phosphor=NtscColor

    (async function () {
      try {
        var base = "../vendor/cathode/src/shaders/";
        var srcs = await Promise.all([
          fetch(base + "lib/math_utils.wgsl").then(function (r) { return r.text(); }),
          fetch(base + "lib/noise_utils.wgsl").then(function (r) { return r.text(); }),
          fetch(base + "signal/composite_decode.wgsl").then(function (r) { return r.text(); }),
          fetch(base + "display/crt_mask_beam.wgsl").then(function (r) { return r.text(); }),
        ]);
        var strip = function (s) { return s.replace(/^[ \t]*#include.*$/gm, ""); };
        var sigSrc = srcs[0] + "\n" + srcs[1] + "\n" + strip(srcs[2]);
        var dispSrc = srcs[0] + "\n" + strip(srcs[3]);
        sigPipe = device.createComputePipeline({ layout: "auto", compute: { module: device.createShaderModule({ code: sigSrc }), entryPoint: "main" } });
        dispPipe = device.createComputePipeline({ layout: "auto", compute: { module: device.createShaderModule({ code: dispSrc }), entryPoint: "main" } });
        var blitMod = device.createShaderModule({ code: BLIT });
        blitPipe = device.createRenderPipeline({ layout: "auto", vertex: { module: blitMod, entryPoint: "vs" }, fragment: { module: blitMod, entryPoint: "fs", targets: [{ format: format }] }, primitive: { topology: "triangle-list" } });
        sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
        sigUBuf = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        dispUBuf = device.createBuffer({ size: 256, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        dummyTex = device.createTexture({ size: [1, 1], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
        ready = true;
      } catch (e) { failed = true; console.warn("Cathode pipeline load failed:", e); }
    })();

    function ensure(w, h) {
      if (W === w && H === h && texScope) return;
      W = w; H = h;
      if (dstCanvas.width !== w || dstCanvas.height !== h) { dstCanvas.width = w; dstCanvas.height = h; ctx.configure({ device: device, format: format, alphaMode: "opaque" }); }
      [texScope, texSig, texDisp].forEach(function (t) { if (t && t.destroy) t.destroy(); });
      texScope = device.createTexture({ size: [w, h], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      texSig = device.createTexture({ size: [w, h], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING });
      texDisp = device.createTexture({ size: [w, h], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING });
    }

    function render(src, t) {
      if (failed || !ready) return false;
      var w = src.width, h = src.height; if (w < 2 || h < 2) return false;
      ensure(w, h);
      device.queue.copyExternalImageToTexture({ source: src }, { texture: texScope }, [w, h]);
      var fi = (t * 60) >>> 0;
      sU[0] = w; sU[1] = h; sU[2] = fi; sU[3] = 0;
      dU[0] = w; dU[1] = h; dU[2] = fi; dU[3] = 0;
      device.queue.writeBuffer(sigUBuf, 0, sigBuf);
      device.queue.writeBuffer(dispUBuf, 0, dispBuf);

      var sigBind = device.createBindGroup({ layout: sigPipe.getBindGroupLayout(0), entries: [
        { binding: 0, resource: texScope.createView() },
        { binding: 1, resource: dummyTex.createView() },
        { binding: 2, resource: texSig.createView() },
        { binding: 3, resource: { buffer: sigUBuf } },
      ]});
      var dispBind = device.createBindGroup({ layout: dispPipe.getBindGroupLayout(0), entries: [
        { binding: 0, resource: texSig.createView() },
        { binding: 1, resource: dummyTex.createView() },
        { binding: 2, resource: texDisp.createView() },
        { binding: 3, resource: sampler },
        { binding: 4, resource: dummyTex.createView() },
        { binding: 5, resource: sampler },
        { binding: 6, resource: { buffer: dispUBuf } },
      ]});
      var blitBind = device.createBindGroup({ layout: blitPipe.getBindGroupLayout(0), entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texDisp.createView() },
      ]});

      var enc = device.createCommandEncoder();
      var gx = Math.ceil(w / 8), gy = Math.ceil(h / 8);
      var p1 = enc.beginComputePass(); p1.setPipeline(sigPipe); p1.setBindGroup(0, sigBind); p1.dispatchWorkgroups(gx, gy); p1.end();
      var p2 = enc.beginComputePass(); p2.setPipeline(dispPipe); p2.setBindGroup(0, dispBind); p2.dispatchWorkgroups(gx, gy); p2.end();
      var rp = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
      rp.setPipeline(blitPipe); rp.setBindGroup(0, blitBind); rp.draw(3); rp.end();
      device.queue.submit([enc.finish()]);
      return true;
    }
    return { render: render };
  }
  return { create: create };
});
