// =============================================================================
//  Signal Rack — signal_core.wgsl
//  CANONICAL ENGINE. Modular WGSL is the product source of truth (per Wild
//  Construct / Etheros conventions: "modular WGSL is the canonical product
//  source", WebGPU/Dawn is the only supported backend).
//
//  This compute shader is the "develop in WebGPU first" surface. It is run:
//    - in the browser via navigator.gpu          (prototypes/webgpu-lab)
//    - natively via the Dawn bridge into AE       (runtime/dawn + plugins/)
//  The SAME .wgsl is embedded in the native binary (IAN_EMBED_WGSL).
//
//  OUTPUTS PHILOSOPHY: the shader emits several *interpreted scalar outputs*
//  per sample — a normalized base plus three profile-mapped channels (A,B,C).
//  Hosts read these scalars; they never re-derive the signal.
// =============================================================================

// ---- parameter block (mirrors include/signalrack/signal_recipe.h) ----------
// Source types:  1 Sine 2 Pulse 3 Ramp 4 Noise 5 RandomWalk 6 Linked 7 LumaProbe
// Output modes:  1 Norm01 2 Signed 3 Percent 4 Degrees 5 Pixels 6 Custom 7 Gate 8 Trigger
struct SignalParams {
    srcType   : f32,
    rate      : f32,   // Hz
    amount    : f32,
    phase     : f32,   // turns 0..1
    seed      : f32,
    offset    : f32,
    smooth    : f32,   // 0..1 box-average amount
    inputA    : f32,   // sidechain value (Linked source), pre-resolved by host

    startTime : f32,   // seconds: time of sample 0
    dt        : f32,   // seconds between samples (frameDuration for AE)
    frameDur  : f32,   // seconds, for trigger edge detection
    sampleN   : f32,   // number of samples to evaluate

    modeA : f32, minA : f32, maxA : f32, _padA : f32,
    modeB : f32, minB : f32, maxB : f32, _padB : f32,
    modeC : f32, minC : f32, maxC : f32, _padC : f32,
};

@group(0) @binding(0) var<uniform>             P       : SignalParams;
// Interpreted scalar outputs, one vec4 per sample: (normalized, A, B, C)
@group(0) @binding(1) var<storage, read_write> outBuf  : array<vec4<f32>>;
// Optional luma source for srcType == 7 (one scalar per sample, host-sampled)
@group(0) @binding(2) var<storage, read>       lumaIn  : array<f32>;

// ---- helpers ----------------------------------------------------------------
fn hash1(n : f32) -> f32 {
    let s = sin(n) * 43758.5453123;
    return s - floor(s);
}
fn smoothstep01(t : f32) -> f32 { return t * t * (3.0 - 2.0 * t); }

// deterministic value noise, returns -1..1, C1 continuous (matches JS reference)
fn vnoise(x : f32) -> f32 {
    let i = floor(x);
    let f = x - i;
    let a = hash1(i);
    let b = hash1(i + 1.0);
    return (a + (b - a) * smoothstep01(f)) * 2.0 - 1.0;
}

// pure unipolar source 0..1 at time tt for sample index idx (idx used for luma)
fn srcUni(tt : f32, idx : u32) -> f32 {
    let st = P.srcType;
    if (st >= 5.5 && st < 6.5) {            // Linked (Input A)
        return clamp(P.inputA, 0.0, 1.0);
    }
    if (st >= 6.5) {                        // Luma Probe (host supplies sample)
        return clamp(lumaIn[idx] + P.offset, 0.0, 1.0);
    }
    let x = tt * P.rate + P.phase;
    var bp : f32 = 0.0;
    if (st < 1.5) {                          // Sine
        bp = sin(x * 6.28318530718);
    } else if (st < 2.5) {                   // Pulse (square, 50% duty)
        bp = select(-1.0, 1.0, (x - floor(x)) < 0.5);
    } else if (st < 3.5) {                   // Ramp / saw
        bp = (x - floor(x)) * 2.0 - 1.0;
    } else if (st < 4.5) {                   // Noise
        bp = vnoise(x + P.seed * 0.123);
    } else {                                 // Random walk (fBm)
        var sum : f32 = 0.0; var amp : f32 = 1.0; var fr : f32 = 1.0; var norm : f32 = 0.0;
        for (var o : i32 = 0; o < 4; o = o + 1) {
            sum = sum + amp * vnoise(x * fr + P.seed + f32(o) * 7.7);
            norm = norm + amp; amp = amp * 0.5; fr = fr * 2.0;
        }
        bp = sum / norm;
    }
    bp = bp * P.amount;
    return (bp + 1.0) * 0.5 + P.offset;
}

// finite box-average smoothing of the source (no recursion / state)
fn smoothed(tt : f32, idx : u32) -> f32 {
    if (P.smooth <= 0.0) { return srcUni(tt, idx); }
    let win = P.smooth * 0.5;
    let N = i32(clamp(P.smooth * 24.0, 1.0, 24.0));
    var acc : f32 = 0.0;
    for (var i : i32 = 0; i < N; i = i + 1) {
        let fnf = select(f32(i) / f32(N - 1), 0.0, N == 1);
        acc = acc + srcUni(tt - win * fnf, idx);
    }
    return acc / f32(N);
}

// map normalized base into one interpreted output channel
fn mapOut(n : f32, tt : f32, idx : u32, mode : f32, mn : f32, mx : f32) -> f32 {
    if (mode >= 6.5 && mode < 7.5) {                    // Gate
        return select(mn, mx, n >= 0.5);
    }
    if (mode >= 7.5) {                                  // Trigger (rising-edge pulse)
        var fired : bool = false;
        for (var k : i32 = 1; k <= 3; k = k + 1) {
            let a = srcUni(tt - f32(k) * P.frameDur, idx) >= 0.5;
            let b = srcUni(tt - f32(k - 1) * P.frameDur, idx) >= 0.5;
            if (b && !a) { fired = true; break; }
        }
        return select(mn, mx, fired);
    }
    return mn + (mx - mn) * clamp(n, 0.0, 1.0);          // continuous remap
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let idx = gid.x;
    if (idx >= u32(P.sampleN)) { return; }
    let tt = P.startTime + f32(idx) * P.dt;
    let n  = clamp(smoothed(tt, idx), 0.0, 1.0);
    let A  = mapOut(n, tt, idx, P.modeA, P.minA, P.maxA);
    let B  = mapOut(n, tt, idx, P.modeB, P.minB, P.maxB);
    let C  = mapOut(n, tt, idx, P.modeC, P.minC, P.maxC);
    outBuf[idx] = vec4<f32>(n, A, B, C);
}
