// =============================================================================
//  Signal Rack — signal_core.wgsl
//  CANONICAL ENGINE. Modular WGSL is the product source of truth.
//
//  The same per-sample pipeline the AE plugin runs via Dawn:
//     source -> smooth -> process (gain/bias/warp/fold/invert/rectify/quantize/
//               gate) -> lag -> output profile  ->  interpreted scalars (n,A,B,C)
//  Sidechain + luma enter as per-sample input buffers (modIn / lumaIn).
//
//  UNIFORM LAYOUT NOTE: params are packed as vec4<f32> rows (NOT a struct of
//  bare scalars). This matches the Wild Construct convention (cf. Cathode's
//  vec-padded uniform blocks) and is required for correct reads on WebKit/Metal
//  (Safari/iOS) — a struct of 36 scalars there read back as zero. The byte
//  layout is identical to the host's flat float[36] (CompiledSignalConfig), so
//  the JS packer and C++ Compile() are unchanged.
// =============================================================================

// Row map (each vec4 = 4 consecutive host floats):
//  v0: srcType  rate     amount   phase
//  v1: seed     offset   smooth   inputA
//  v2: startTime dt      frameDur sampleN
//  v3: modeA    minA     maxA     padA
//  v4: modeB    minB     maxB     padB
//  v5: modeC    minC     maxC     padC
//  v6: pGain    pBias    pQuant   pGate
//  v7: pLag     pInvert  pRectify modTarget
//  v8: modDepth pWarp    pFold    pad2
struct SignalParams {
    v0 : vec4<f32>, v1 : vec4<f32>, v2 : vec4<f32>,
    v3 : vec4<f32>, v4 : vec4<f32>, v5 : vec4<f32>,
    v6 : vec4<f32>, v7 : vec4<f32>, v8 : vec4<f32>,
};

@group(0) @binding(0) var<uniform>             P      : SignalParams;
@group(0) @binding(1) var<storage, read_write> outBuf : array<vec4<f32>>;
@group(0) @binding(2) var<storage, read>       lumaIn : array<f32>;
@group(0) @binding(3) var<storage, read>       modIn  : array<f32>;

// named accessors (keep the body readable; compile to direct vec lane reads)
fn pSrc()     -> f32 { return P.v0.x; }
fn pRate()    -> f32 { return P.v0.y; }
fn pAmount()  -> f32 { return P.v0.z; }
fn pPhase()   -> f32 { return P.v0.w; }
fn pSeed()    -> f32 { return P.v1.x; }
fn pOffset()  -> f32 { return P.v1.y; }
fn pSmooth()  -> f32 { return P.v1.z; }
fn pInputA()  -> f32 { return P.v1.w; }
fn pStart()   -> f32 { return P.v2.x; }
fn pDt()      -> f32 { return P.v2.y; }
fn pFrameDur()-> f32 { return P.v2.z; }
fn pSampleN() -> f32 { return P.v2.w; }
fn pGain()    -> f32 { return P.v6.x; }
fn pBias()    -> f32 { return P.v6.y; }
fn pQuant()   -> f32 { return P.v6.z; }
fn pGate()    -> f32 { return P.v6.w; }
fn pLag()     -> f32 { return P.v7.x; }
fn pInvert()  -> f32 { return P.v7.y; }
fn pRectify() -> f32 { return P.v7.z; }
fn pModTgt()  -> f32 { return P.v7.w; }
fn pModDepth()-> f32 { return P.v8.x; }
fn pWarp()    -> f32 { return P.v8.y; }
fn pFold()    -> f32 { return P.v8.z; }

fn hash1(n : f32) -> f32 { let s = sin(n) * 43758.5453123; return s - floor(s); }
fn smoothstep01(t : f32) -> f32 { return t * t * (3.0 - 2.0 * t); }
fn vnoise(x : f32) -> f32 { let i = floor(x); let f = x - i; let a = hash1(i); let b = hash1(i + 1.0); return (a + (b - a) * smoothstep01(f)) * 2.0 - 1.0; }

fn srcUni(tt : f32, idx : u32) -> f32 {
    let st = pSrc();
    if (st >= 5.5 && st < 6.5) { return clamp(pInputA(), 0.0, 1.0); }       // Linked
    if (st >= 6.5) { return clamp(lumaIn[idx] + pOffset(), 0.0, 1.0); }     // Luma probe

    var rate = pRate(); var amount = pAmount(); var phase = pPhase();
    if (pModTgt() > 0.5) {                                                  // sidechain modulation
        let m = modIn[idx]; let d = pModDepth();
        if (pModTgt() < 1.5)      { amount = amount * (1.0 - d + d * m); }
        else if (pModTgt() < 2.5) { rate   = rate   * (1.0 + d * (m * 2.0 - 1.0)); }
        else                      { phase  = phase  + d * m; }
    }
    let x = tt * rate + phase;
    var bp : f32 = 0.0;
    if (st < 1.5) { bp = sin(x * 6.28318530718); }
    else if (st < 2.5) { bp = select(-1.0, 1.0, (x - floor(x)) < 0.5); }
    else if (st < 3.5) { bp = (x - floor(x)) * 2.0 - 1.0; }
    else if (st < 4.5) { bp = vnoise(x + pSeed() * 0.123); }
    else {
        var sum : f32 = 0.0; var amp : f32 = 1.0; var fr : f32 = 1.0; var norm : f32 = 0.0;
        for (var o : i32 = 0; o < 4; o = o + 1) { sum = sum + amp * vnoise(x*fr + pSeed() + f32(o)*7.7); norm = norm + amp; amp = amp * 0.5; fr = fr * 2.0; }
        bp = sum / norm;
    }
    bp = bp * amount;
    return (bp + 1.0) * 0.5 + pOffset();
}

fn smoothed(tt : f32, idx : u32) -> f32 {
    let sm = pSmooth();
    if (sm <= 0.0) { return srcUni(tt, idx); }
    let win = sm * 0.5;
    let N = i32(clamp(sm * 24.0, 1.0, 24.0));
    var acc : f32 = 0.0;
    for (var i : i32 = 0; i < N; i = i + 1) { let fnf = select(f32(i) / f32(N - 1), 0.0, N == 1); acc = acc + srcUni(tt - win * fnf, idx); }
    return acc / f32(N);
}

fn pointwise(n0 : f32) -> f32 {
    var n = n0;
    if (pGain() != 1.0 || pBias() != 0.0) { n = clamp(0.5 + (n - 0.5) * pGain() + pBias(), 0.0, 1.0); }
    if (pWarp() != 0.0) {
        let bp = n * 2.0 - 1.0;
        let pw = pow(3.0, -pWarp());
        n = (sign(bp) * pow(abs(bp), pw) + 1.0) * 0.5;
    }
    if (pFold() > 0.0) {
        let x = (n * 2.0 - 1.0) * (1.0 + pFold() * 6.0);
        let xm = (x - 1.0) - 4.0 * floor((x - 1.0) / 4.0);
        n = abs(xm - 2.0) * 0.5;
    }
    if (pInvert() > 0.5) { n = 1.0 - n; }
    if (pRectify() > 0.5) { n = abs(n * 2.0 - 1.0); }
    if (pQuant() > 1.5) { n = round(n * (pQuant() - 1.0)) / (pQuant() - 1.0); }
    if (pGate() > 0.0) { n = select(0.0, 1.0, n >= pGate()); }
    return n;
}
fn shapedN(tt : f32, idx : u32) -> f32 { return pointwise(clamp(smoothed(tt, idx), 0.0, 1.0)); }

fn normN(tt : f32, idx : u32) -> f32 {
    let lag = pLag();
    if (lag <= 0.0) { return shapedN(tt, idx); }
    let K = i32(min(34.0, round(lag * 32.0) + 2.0));
    var acc : f32 = 0.0; var wsum : f32 = 0.0; var w : f32 = 1.0;
    for (var k : i32 = 0; k < K; k = k + 1) {
        var j : i32 = i32(idx) - k; if (j < 0) { j = 0; }
        acc = acc + w * shapedN(tt - f32(k) * pFrameDur(), u32(j));
        wsum = wsum + w; w = w * lag;
    }
    return acc / wsum;
}

fn mapOut(n : f32, tt : f32, idx : u32, mode : f32, mn : f32, mx : f32) -> f32 {
    if (mode >= 6.5 && mode < 7.5) { return select(mn, mx, n >= 0.5); }     // Gate
    if (mode >= 7.5) {                                                      // Trigger
        var fired : bool = false;
        for (var k : i32 = 1; k <= 3; k = k + 1) {
            let a = srcUni(tt - f32(k) * pFrameDur(), idx) >= 0.5;
            let b = srcUni(tt - f32(k - 1) * pFrameDur(), idx) >= 0.5;
            if (b && !a) { fired = true; break; }
        }
        return select(mn, mx, fired);
    }
    return mn + (mx - mn) * clamp(n, 0.0, 1.0);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let idx = gid.x;
    if (idx >= u32(pSampleN())) { return; }
    let tt = pStart() + f32(idx) * pDt();
    let n  = clamp(normN(tt, idx), 0.0, 1.0);
    let A  = mapOut(n, tt, idx, P.v3.x, P.v3.y, P.v3.z);
    let B  = mapOut(n, tt, idx, P.v4.x, P.v4.y, P.v4.z);
    let C  = mapOut(n, tt, idx, P.v5.x, P.v5.y, P.v5.z);
    outBuf[idx] = vec4<f32>(n, A, B, C);
}
