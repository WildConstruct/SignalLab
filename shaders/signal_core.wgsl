// =============================================================================
//  Signal Rack — signal_core.wgsl
//  CANONICAL ENGINE. Modular WGSL is the product source of truth (per Wild
//  Construct / Etheros conventions: "modular WGSL is the canonical product
//  source", WebGPU/Dawn is the only supported backend).
//
//  This compute shader is the "develop in WebGPU first" surface. The SAME .wgsl
//  runs in the browser (prototypes/webgpu-lab, tool/) and natively via the Dawn
//  bridge into AE. The engine owns the WHOLE per-sample pipeline so hosts only
//  configure and call it:
//
//      source -> smooth -> process (gain/bias/invert/rectify/quantize/gate)
//             -> lag -> output profile  ->  interpreted scalar outputs (n,A,B,C)
//
//  Sidechain (signal-drives-signal) and luma probing enter as per-sample input
//  buffers (modIn / lumaIn) — the engine, not the host, applies them.
// =============================================================================

// Source types:  1 Sine 2 Pulse 3 Ramp 4 Noise 5 RandomWalk 6 Linked 7 LumaProbe
// Output modes:  1 Norm01 2 Signed 3 Percent 4 Degrees 5 Pixels 6 Custom 7 Gate 8 Trigger
// Mod targets:   0 off 1 amplitude 2 rate 3 phase
struct SignalParams {
    srcType   : f32, rate : f32, amount : f32, phase : f32,
    seed      : f32, offset : f32, smooth : f32, inputA : f32,
    startTime : f32, dt : f32, frameDur : f32, sampleN : f32,
    modeA : f32, minA : f32, maxA : f32, _padA : f32,
    modeB : f32, minB : f32, maxB : f32, _padB : f32,
    modeC : f32, minC : f32, maxC : f32, _padC : f32,
    // processor stage:
    pGain : f32, pBias : f32, pQuant : f32, pGate : f32,
    pLag  : f32, pInvert : f32, pRectify : f32, modTarget : f32,
    modDepth : f32, _pad0 : f32, _pad1 : f32, _pad2 : f32,
};

@group(0) @binding(0) var<uniform>             P      : SignalParams;
@group(0) @binding(1) var<storage, read_write> outBuf : array<vec4<f32>>;
@group(0) @binding(2) var<storage, read>       lumaIn : array<f32>;   // per-sample luma (probe)
@group(0) @binding(3) var<storage, read>       modIn  : array<f32>;   // per-sample modulator (sidechain)

fn hash1(n : f32) -> f32 { let s = sin(n) * 43758.5453123; return s - floor(s); }
fn smoothstep01(t : f32) -> f32 { return t * t * (3.0 - 2.0 * t); }
fn vnoise(x : f32) -> f32 { let i = floor(x); let f = x - i; let a = hash1(i); let b = hash1(i + 1.0); return (a + (b - a) * smoothstep01(f)) * 2.0 - 1.0; }

// pure unipolar source 0..1 at time tt for sample idx
fn srcUni(tt : f32, idx : u32) -> f32 {
    let st = P.srcType;
    if (st >= 5.5 && st < 6.5) { return clamp(P.inputA, 0.0, 1.0); }       // Linked
    if (st >= 6.5) { return clamp(lumaIn[idx] + P.offset, 0.0, 1.0); }      // Luma probe

    var rate = P.rate; var amount = P.amount; var phase = P.phase;
    if (P.modTarget > 0.5) {                                                // sidechain modulation
        let m = modIn[idx];
        if (P.modTarget < 1.5)      { amount = amount * (1.0 - P.modDepth + P.modDepth * m); }
        else if (P.modTarget < 2.5) { rate   = rate   * (1.0 + P.modDepth * (m * 2.0 - 1.0)); }
        else                        { phase  = phase  + P.modDepth * m; }
    }
    let x = tt * rate + phase;
    var bp : f32 = 0.0;
    if (st < 1.5) { bp = sin(x * 6.28318530718); }
    else if (st < 2.5) { bp = select(-1.0, 1.0, (x - floor(x)) < 0.5); }
    else if (st < 3.5) { bp = (x - floor(x)) * 2.0 - 1.0; }
    else if (st < 4.5) { bp = vnoise(x + P.seed * 0.123); }
    else {
        var sum : f32 = 0.0; var amp : f32 = 1.0; var fr : f32 = 1.0; var norm : f32 = 0.0;
        for (var o : i32 = 0; o < 4; o = o + 1) { sum = sum + amp * vnoise(x*fr + P.seed + f32(o)*7.7); norm = norm + amp; amp = amp * 0.5; fr = fr * 2.0; }
        bp = sum / norm;
    }
    bp = bp * amount;
    return (bp + 1.0) * 0.5 + P.offset;
}

fn smoothed(tt : f32, idx : u32) -> f32 {
    if (P.smooth <= 0.0) { return srcUni(tt, idx); }
    let win = P.smooth * 0.5;
    let N = i32(clamp(P.smooth * 24.0, 1.0, 24.0));
    var acc : f32 = 0.0;
    for (var i : i32 = 0; i < N; i = i + 1) { let fnf = select(f32(i) / f32(N - 1), 0.0, N == 1); acc = acc + srcUni(tt - win * fnf, idx); }
    return acc / f32(N);
}

// pointwise processor on a normalized value
fn pointwise(n0 : f32) -> f32 {
    var n = n0;
    if (P.pGain != 1.0 || P.pBias != 0.0) { n = clamp(0.5 + (n - 0.5) * P.pGain + P.pBias, 0.0, 1.0); }
    if (P.pInvert > 0.5) { n = 1.0 - n; }
    if (P.pRectify > 0.5) { n = abs(n * 2.0 - 1.0); }
    if (P.pQuant > 1.5) { n = round(n * (P.pQuant - 1.0)) / (P.pQuant - 1.0); }
    if (P.pGate > 0.0) { n = select(0.0, 1.0, n >= P.pGate); }
    return n;
}
fn shapedN(tt : f32, idx : u32) -> f32 { return pointwise(clamp(smoothed(tt, idx), 0.0, 1.0)); }

// normalized value after lag (finite geometric EWMA — matches the CPU reference)
fn normN(tt : f32, idx : u32) -> f32 {
    if (P.pLag <= 0.0) { return shapedN(tt, idx); }
    let K = i32(min(34.0, round(P.pLag * 32.0) + 2.0));
    var acc : f32 = 0.0; var wsum : f32 = 0.0; var w : f32 = 1.0;
    for (var k : i32 = 0; k < K; k = k + 1) {
        var j : i32 = i32(idx) - k; if (j < 0) { j = 0; }
        acc = acc + w * shapedN(tt - f32(k) * P.frameDur, u32(j));
        wsum = wsum + w; w = w * P.pLag;
    }
    return acc / wsum;
}

fn mapOut(n : f32, tt : f32, idx : u32, mode : f32, mn : f32, mx : f32) -> f32 {
    if (mode >= 6.5 && mode < 7.5) { return select(mn, mx, n >= 0.5); }     // Gate
    if (mode >= 7.5) {                                                      // Trigger
        var fired : bool = false;
        for (var k : i32 = 1; k <= 3; k = k + 1) {
            let a = srcUni(tt - f32(k) * P.frameDur, idx) >= 0.5;
            let b = srcUni(tt - f32(k - 1) * P.frameDur, idx) >= 0.5;
            if (b && !a) { fired = true; break; }
        }
        return select(mn, mx, fired);
    }
    return mn + (mx - mn) * clamp(n, 0.0, 1.0);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let idx = gid.x;
    if (idx >= u32(P.sampleN)) { return; }
    let tt = P.startTime + f32(idx) * P.dt;
    let n  = clamp(normN(tt, idx), 0.0, 1.0);
    let A  = mapOut(n, tt, idx, P.modeA, P.minA, P.maxA);
    let B  = mapOut(n, tt, idx, P.modeB, P.minB, P.maxB);
    let C  = mapOut(n, tt, idx, P.modeC, P.minC, P.maxC);
    outBuf[idx] = vec4<f32>(n, A, B, C);
}
