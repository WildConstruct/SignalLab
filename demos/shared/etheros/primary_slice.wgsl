struct NoiseParams {
    seed: f32,
    scale: f32,
    octaves: i32,
    lacunarity: f32,
    gain: f32,
    offset: vec3<f32>,
    phase_offset: f32,
    absolute: u32,
    ridged: u32,
    invert: u32,
    brightness: f32,
    contrast: f32,
    warp_strength: f32,
    time: f32,
    threshold_low: f32,
    threshold_high: f32,
    clamp_low: f32,
    clamp_high: f32,
    fractal_mode: u32,
    warp_scale: f32,
    flow_direction: vec2<f32>,
    flow_strength: f32,
    band_low: f32,
    band_mid: f32,
    band_high: f32,
    band_low_scale: f32,
    band_mid_scale: f32,
    band_high_scale: f32,
    band_low_roughness: f32,
    band_mid_roughness: f32,
    band_high_roughness: f32,
    warp_type: u32,
    secondary_seed: f32,
    motion_mode: u32,
    evolution_rate: f32,
    anisotropy: f32,
    streak_length: f32,
    primitive_type: u32,
    normalize_output: u32,
    range_min: f32,
    range_max: f32,
    shape_gain: f32,
    detail_scale: f32,
    roughness: f32,
    amplitude: f32,
    output_type: u32,
    variation: f32,
    coherence: f32,
    tile_x: u32,
    tile_y: u32,
    temporal_stability: f32,
    use_camera_plane: u32,
    camera_plane_origin: vec3<f32>,
    camera_plane_u: vec3<f32>,
    camera_plane_v: vec3<f32>,
    volume_enabled: u32,
    volume_depth: f32,
    volume_opacity: f32,
    volume_light_strength: f32,
    volume_ceiling_enabled: u32,
    volume_ceiling_height: f32,
    volume_ceiling_softness: f32,
    volume_ceiling_breakup: f32,
    volume_ceiling_scale: f32,
}

@group(0) @binding(0) var<uniform> params: NoiseParams;
@group(0) @binding(1) var output_tex: texture_storage_2d<rgba8unorm, write>;

const SIMPLEX_SKEW_3D = 1.0 / 3.0;
const SIMPLEX_UNSKEW_3D = 1.0 / 6.0;

fn hash33(p: vec3<f32>) -> vec3<f32> {
    var p3 = fract(p * vec3<f32>(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yxx) * p3.zyx);
}

fn hash13(p: f32) -> f32 {
    var p3 = fract(vec3<f32>(p) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn fade3(t: vec3<f32>) -> vec3<f32> {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

fn value_at(cell: vec3<f32>) -> f32 {
    return hash33(cell).x * 2.0 - 1.0;
}

fn cubic_curve(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
    let p = (d - c) - (a - b);
    return t * (t * (t * p + ((a - b) - p)) + (c - a)) + b;
}

fn lattice_gradient(cell: vec3<f32>) -> vec3<f32> {
    let h = hash33(cell);
    let g = vec3<f32>(h.x * 2.0 - 1.0, h.y * 2.0 - 1.0, h.z * 2.0 - 1.0);
    return normalize(g + vec3<f32>(1e-5, 0.0, 0.0));
}

fn simplex_noise_3d(p: vec3<f32>) -> f32 {
    let s = (p.x + p.y + p.z) * SIMPLEX_SKEW_3D;
    let ip = floor(p + s);
    let t = (ip.x + ip.y + ip.z) * SIMPLEX_UNSKEW_3D;
    let p0 = p - ip + t;
    var i1: vec3<f32>;
    var i2: vec3<f32>;

    if (p0.x >= p0.y) {
        if (p0.y >= p0.z) {
            i1 = vec3<f32>(1.0, 0.0, 0.0);
            i2 = vec3<f32>(1.0, 1.0, 0.0);
        } else if (p0.x >= p0.z) {
            i1 = vec3<f32>(1.0, 0.0, 0.0);
            i2 = vec3<f32>(1.0, 0.0, 1.0);
        } else {
            i1 = vec3<f32>(0.0, 0.0, 1.0);
            i2 = vec3<f32>(1.0, 0.0, 1.0);
        }
    } else {
        if (p0.y < p0.z) {
            i1 = vec3<f32>(0.0, 0.0, 1.0);
            i2 = vec3<f32>(0.0, 1.0, 1.0);
        } else if (p0.x < p0.z) {
            i1 = vec3<f32>(0.0, 1.0, 0.0);
            i2 = vec3<f32>(0.0, 1.0, 1.0);
        } else {
            i1 = vec3<f32>(0.0, 1.0, 0.0);
            i2 = vec3<f32>(1.0, 1.0, 0.0);
        }
    }

    let p1 = p0 - i1 + SIMPLEX_UNSKEW_3D;
    let p2 = p0 - i2 + 2.0 * SIMPLEX_UNSKEW_3D;
    let p3 = p0 - 1.0 + 3.0 * SIMPLEX_UNSKEW_3D;
    var n = 0.0;

    var t0 = 0.6 - dot(p0, p0);
    if (t0 > 0.0) {
        t0 *= t0;
        let grad = hash33(ip) * 2.0 - 1.0;
        n += t0 * t0 * dot(grad, p0);
    }
    var t1 = 0.6 - dot(p1, p1);
    if (t1 > 0.0) {
        t1 *= t1;
        let grad = hash33(ip + i1) * 2.0 - 1.0;
        n += t1 * t1 * dot(grad, p1);
    }
    var t2 = 0.6 - dot(p2, p2);
    if (t2 > 0.0) {
        t2 *= t2;
        let grad = hash33(ip + i2) * 2.0 - 1.0;
        n += t2 * t2 * dot(grad, p2);
    }
    var t3 = 0.6 - dot(p3, p3);
    if (t3 > 0.0) {
        t3 *= t3;
        let grad = hash33(ip + vec3<f32>(1.0, 1.0, 1.0)) * 2.0 - 1.0;
        n += t3 * t3 * dot(grad, p3);
    }

    return 32.0 * n;
}

fn perlin_noise_3d(p: vec3<f32>) -> f32 {
    let cell = floor(p);
    let local = fract(p);
    let f = fade3(local);

    let p000 = dot(lattice_gradient(cell + vec3<f32>(0.0, 0.0, 0.0)), local - vec3<f32>(0.0, 0.0, 0.0));
    let p100 = dot(lattice_gradient(cell + vec3<f32>(1.0, 0.0, 0.0)), local - vec3<f32>(1.0, 0.0, 0.0));
    let p010 = dot(lattice_gradient(cell + vec3<f32>(0.0, 1.0, 0.0)), local - vec3<f32>(0.0, 1.0, 0.0));
    let p110 = dot(lattice_gradient(cell + vec3<f32>(1.0, 1.0, 0.0)), local - vec3<f32>(1.0, 1.0, 0.0));
    let p001 = dot(lattice_gradient(cell + vec3<f32>(0.0, 0.0, 1.0)), local - vec3<f32>(0.0, 0.0, 1.0));
    let p101 = dot(lattice_gradient(cell + vec3<f32>(1.0, 0.0, 1.0)), local - vec3<f32>(1.0, 0.0, 1.0));
    let p011 = dot(lattice_gradient(cell + vec3<f32>(0.0, 1.0, 1.0)), local - vec3<f32>(0.0, 1.0, 1.0));
    let p111 = dot(lattice_gradient(cell + vec3<f32>(1.0, 1.0, 1.0)), local - vec3<f32>(1.0, 1.0, 1.0));

    let x00 = mix(p000, p100, f.x);
    let x10 = mix(p010, p110, f.x);
    let x01 = mix(p001, p101, f.x);
    let x11 = mix(p011, p111, f.x);
    let y0 = mix(x00, x10, f.y);
    let y1 = mix(x01, x11, f.y);
    return mix(y0, y1, f.z);
}

fn value_noise_3d(p: vec3<f32>) -> f32 {
    let cell = floor(p);
    let local = fract(p);
    let f = local * local * (3.0 - 2.0 * local);
    let v000 = value_at(cell + vec3<f32>(0.0, 0.0, 0.0));
    let v100 = value_at(cell + vec3<f32>(1.0, 0.0, 0.0));
    let v010 = value_at(cell + vec3<f32>(0.0, 1.0, 0.0));
    let v110 = value_at(cell + vec3<f32>(1.0, 1.0, 0.0));
    let v001 = value_at(cell + vec3<f32>(0.0, 0.0, 1.0));
    let v101 = value_at(cell + vec3<f32>(1.0, 0.0, 1.0));
    let v011 = value_at(cell + vec3<f32>(0.0, 1.0, 1.0));
    let v111 = value_at(cell + vec3<f32>(1.0, 1.0, 1.0));
    let x00 = mix(v000, v100, f.x);
    let x10 = mix(v010, v110, f.x);
    let x01 = mix(v001, v101, f.x);
    let x11 = mix(v011, v111, f.x);
    let y0 = mix(x00, x10, f.y);
    let y1 = mix(x01, x11, f.y);
    return mix(y0, y1, f.z);
}

fn value_cubic_noise_3d(p: vec3<f32>) -> f32 {
    let cell = floor(p);
    let local = fract(p);
    var z_samples: array<f32, 4>;
    for (var z = 0u; z < 4u; z++) {
        var y_samples: array<f32, 4>;
        let z_offset = f32(z) - 1.0;
        for (var y = 0u; y < 4u; y++) {
            let base = cell + vec3<f32>(-1.0, f32(y) - 1.0, z_offset);
            let v0 = value_at(base + vec3<f32>(0.0, 0.0, 0.0));
            let v1 = value_at(base + vec3<f32>(1.0, 0.0, 0.0));
            let v2 = value_at(base + vec3<f32>(2.0, 0.0, 0.0));
            let v3 = value_at(base + vec3<f32>(3.0, 0.0, 0.0));
            y_samples[y] = cubic_curve(v0, v1, v2, v3, local.x);
        }
        z_samples[z] = cubic_curve(y_samples[0], y_samples[1], y_samples[2], y_samples[3], local.y);
    }
    return clamp(cubic_curve(z_samples[0], z_samples[1], z_samples[2], z_samples[3], local.z) * 0.75, -1.0, 1.0);
}

fn worley_noise_3d(p: vec3<f32>) -> f32 {
    let cell = floor(p);
    var min_dist = 1e9;
    var second_min_dist = 1e9;
    let jitter_seed = vec3<f32>(params.secondary_seed * 0.013, params.seed * 0.007, params.secondary_seed * 0.021 + 17.0);
    for (var z = -1; z <= 1; z++) {
        for (var y = -1; y <= 1; y++) {
            for (var x = -1; x <= 1; x++) {
                let neighbor = cell + vec3<f32>(f32(x), f32(y), f32(z));
                let feature = neighbor + hash33(neighbor + jitter_seed);
                let dist = distance(p, feature);
                if (dist < min_dist) {
                    second_min_dist = min_dist;
                    min_dist = dist;
                } else if (dist < second_min_dist) {
                    second_min_dist = dist;
                }
            }
        }
    }
    let cell_fill = clamp(1.0 - min_dist * 1.2, 0.0, 1.0);
    let edge = clamp((second_min_dist - min_dist) * 2.2, 0.0, 1.0);
    return mix(cell_fill, edge, 0.58) * 2.0 - 1.0;
}

fn cellular_edge_noise_3d(p: vec3<f32>) -> f32 {
    let cell = floor(p);
    var min_dist = 1e9;
    var second_min_dist = 1e9;
    let jitter_seed = vec3<f32>(params.secondary_seed * 0.013, params.seed * 0.007, params.secondary_seed * 0.021 + 17.0);
    for (var z = -1; z <= 1; z++) {
        for (var y = -1; y <= 1; y++) {
            for (var x = -1; x <= 1; x++) {
                let neighbor = cell + vec3<f32>(f32(x), f32(y), f32(z));
                let feature = neighbor + hash33(neighbor + jitter_seed);
                let dist = distance(p, feature);
                if (dist < min_dist) {
                    second_min_dist = min_dist;
                    min_dist = dist;
                } else if (dist < second_min_dist) {
                    second_min_dist = dist;
                }
            }
        }
    }
    return clamp((second_min_dist - min_dist) * 2.85, 0.0, 1.0) * 2.0 - 1.0;
}

fn bubble_noise_3d(p: vec3<f32>) -> f32 {
    let cell = floor(p);
    var min_dist = 1e9;
    var second_min_dist = 1e9;
    var nearest_feature = vec3<f32>(0.0, 0.0, 0.0);
    var nearest_hash = vec3<f32>(0.0, 0.0, 0.0);
    let jitter_seed = vec3<f32>(params.secondary_seed * 0.013, params.seed * 0.007, params.secondary_seed * 0.021 + 17.0);
    for (var z = -1; z <= 1; z++) {
        for (var y = -1; y <= 1; y++) {
            for (var x = -1; x <= 1; x++) {
                let neighbor = cell + vec3<f32>(f32(x), f32(y), f32(z));
                let feature_hash = hash33(neighbor + jitter_seed);
                let feature = neighbor + feature_hash;
                let dist = distance(p, feature);
                if (dist < min_dist) {
                    second_min_dist = min_dist;
                    min_dist = dist;
                    nearest_feature = feature;
                    nearest_hash = feature_hash;
                } else if (dist < second_min_dist) {
                    second_min_dist = dist;
                }
            }
        }
    }
    let radius = 0.22 + nearest_hash.z * 0.18;
    let shell = clamp(1.0 - abs(min_dist - radius) / max(radius * 0.55, 0.04), 0.0, 1.0);
    let core = clamp(1.0 - min_dist / max(radius * 1.65, 0.06), 0.0, 1.0);
    let cavity = clamp((second_min_dist - min_dist) * 2.4, 0.0, 1.0);
    let drift_dir = normalize(nearest_hash * 2.0 - 1.0 + vec3<f32>(1e-4, 0.0, 0.0));
    let drift = clamp(0.5 + 0.5 * dot(normalize(p - nearest_feature + drift_dir * 0.25), drift_dir), 0.0, 1.0);
    let bubble = mix(core, shell, 0.62);
    return clamp((bubble * (0.82 + cavity * 0.24) * (0.78 + drift * 0.22)) * 2.0 - 1.0, -1.0, 1.0);
}

fn phasor_corner_wave_3d(local: vec3<f32>, lattice_corner: vec3<f32>) -> f32 {
    let h0 = hash33(lattice_corner + vec3<f32>(17.0, 31.0, 47.0));
    let h1 = hash33(lattice_corner + vec3<f32>(59.0, 11.0, 23.0));
    let dir0 = normalize(h0 * 2.0 - 1.0 + vec3<f32>(1e-4, 0.0, 0.0));
    let dir1 = normalize(h1 * 2.0 - 1.0 + vec3<f32>(0.0, 1e-4, 0.0));
    let angle0 = dot(local, dir0) * 6.2831853 + h0.x * 6.2831853;
    let angle1 = dot(local.yzx + dir0.zxy * 0.35, dir1) * 3.14159265 + h1.y * 6.2831853;
    return sin(angle0) * 0.72 + cos(angle1) * 0.28;
}

fn phasor_noise_3d(p: vec3<f32>) -> f32 {
    let cell = floor(p);
    let local = fract(p);
    let f = fade3(local);
    let n000 = phasor_corner_wave_3d(local - vec3<f32>(0.0, 0.0, 0.0), cell + vec3<f32>(0.0, 0.0, 0.0));
    let n100 = phasor_corner_wave_3d(local - vec3<f32>(1.0, 0.0, 0.0), cell + vec3<f32>(1.0, 0.0, 0.0));
    let n010 = phasor_corner_wave_3d(local - vec3<f32>(0.0, 1.0, 0.0), cell + vec3<f32>(0.0, 1.0, 0.0));
    let n110 = phasor_corner_wave_3d(local - vec3<f32>(1.0, 1.0, 0.0), cell + vec3<f32>(1.0, 1.0, 0.0));
    let n001 = phasor_corner_wave_3d(local - vec3<f32>(0.0, 0.0, 1.0), cell + vec3<f32>(0.0, 0.0, 1.0));
    let n101 = phasor_corner_wave_3d(local - vec3<f32>(1.0, 0.0, 1.0), cell + vec3<f32>(1.0, 0.0, 1.0));
    let n011 = phasor_corner_wave_3d(local - vec3<f32>(0.0, 1.0, 1.0), cell + vec3<f32>(0.0, 1.0, 1.0));
    let n111 = phasor_corner_wave_3d(local - vec3<f32>(1.0, 1.0, 1.0), cell + vec3<f32>(1.0, 1.0, 1.0));
    let x00 = mix(n000, n100, f.x);
    let x10 = mix(n010, n110, f.x);
    let x01 = mix(n001, n101, f.x);
    let x11 = mix(n011, n111, f.x);
    let y0 = mix(x00, x10, f.y);
    let y1 = mix(x01, x11, f.y);
    return clamp(mix(y0, y1, f.z), -1.0, 1.0);
}

fn chladni_noise_3d(p: vec3<f32>) -> f32 {
    let seed_basis = hash33(vec3<f32>(
        params.seed * 0.013 + 7.1,
        params.secondary_seed * 0.011 + 19.7,
        params.seed * 0.007 + params.secondary_seed * 0.017 + 31.3)) * 2.0 - 1.0;
    let dir0 = normalize(seed_basis + vec3<f32>(0.92, 0.28, 0.17));
    let dir1 = normalize(seed_basis.yzx + vec3<f32>(-0.31, 0.86, 0.22));
    let dir2 = normalize(seed_basis.zxy + vec3<f32>(0.19, -0.24, 0.95));
    let phase = params.phase_offset * 6.2831853;
    let a = sin(dot(p, dir0) * 5.4 + phase);
    let b = sin(dot(p, dir1) * 6.7 - phase * 0.7 + params.seed * 0.11);
    let c = sin(dot(p, dir2) * 3.8 + params.secondary_seed * 0.09);
    let interference = a * b - c * 0.45;
    return clamp((1.0 - abs(interference)) * 2.0 - 1.0, -1.0, 1.0);
}

fn primitive_noise_3d(p: vec3<f32>) -> f32 {
    switch params.primitive_type {
        case 1u: { return perlin_noise_3d(p); }
        case 2u: { return value_noise_3d(p); }
        case 3u: { return worley_noise_3d(p); }
        case 4u: { return phasor_noise_3d(p); }
        case 5u: { return value_cubic_noise_3d(p); }
        case 6u: { return cellular_edge_noise_3d(p); }
        case 7u: { return chladni_noise_3d(p); }
        case 8u: { return bubble_noise_3d(p); }
        default: { return simplex_noise_3d(p); }
    }
}

fn safe_direction(dir: vec2<f32>) -> vec2<f32> {
    let len = length(dir);
    if (len <= 1e-5) {
        return vec2<f32>(1.0, 0.0);
    }
    return dir / len;
}

fn camera_plane_normal() -> vec3<f32> {
    let plane_normal = cross(params.camera_plane_u, params.camera_plane_v);
    let len = length(plane_normal);
    if (len <= 1e-5) {
        return vec3<f32>(0.0, 0.0, 1.0);
    }
    return plane_normal / len;
}

fn sample_plane_u_dir() -> vec3<f32> {
    if (params.use_camera_plane == 1u) {
        let len = length(params.camera_plane_u);
        if (len > 1e-5) {
            return params.camera_plane_u / len;
        }
    }
    return vec3<f32>(1.0, 0.0, 0.0);
}

fn sample_plane_v_dir() -> vec3<f32> {
    if (params.use_camera_plane == 1u) {
        let len = length(params.camera_plane_v);
        if (len > 1e-5) {
            return params.camera_plane_v / len;
        }
    }
    return vec3<f32>(0.0, 1.0, 0.0);
}

fn sample_plane_origin() -> vec3<f32> {
    if (params.use_camera_plane == 1u) {
        return params.camera_plane_origin;
    }
    return vec3<f32>(0.0, 0.0, 0.0);
}

fn world_position_from_uv(uv: vec2<f32>, sample_scale: f32) -> vec3<f32> {
    let centered_uv = uv - vec2<f32>(0.5, 0.5);
    let u_dir = sample_plane_u_dir();
    let v_dir = sample_plane_v_dir();
    let n_dir = camera_plane_normal();
    return sample_plane_origin() +
        u_dir * ((centered_uv.x + params.offset.x) * sample_scale) +
        v_dir * ((centered_uv.y + params.offset.y) * sample_scale) +
        n_dir * (params.offset.z * sample_scale);
}

fn phase_z_value() -> f32 {
    return params.phase_offset * 0.15;
}

fn octave_band_scale(octave: i32, octave_count: i32) -> f32 {
    let normalized = f32(octave) / f32(max(octave_count, 1));
    if (normalized < 0.33333334) { return params.band_low_scale; }
    if (normalized < 0.6666667) { return params.band_mid_scale; }
    return params.band_high_scale;
}

fn octave_band_roughness(octave: i32, octave_count: i32) -> f32 {
    let normalized = f32(octave) / f32(max(octave_count, 1));
    if (normalized < 0.33333334) { return params.band_low_roughness; }
    if (normalized < 0.6666667) { return params.band_mid_roughness; }
    return params.band_high_roughness;
}

fn octave_band_bucket(octave: i32, octave_count: i32) -> i32 {
    let normalized = f32(octave) / f32(max(octave_count, 1));
    if (normalized < 0.33333334) { return 0; }
    if (normalized < 0.6666667) { return 1; }
    return 2;
}

fn compose_band_field(low_band: f32, mid_band: f32, high_band: f32) -> f32 {
    let low01 = clamp(low_band * 0.5 + 0.5, 0.0, 1.0);
    let mid01 = clamp(mid_band * 0.5 + 0.5, 0.0, 1.0);
    let high01 = clamp(high_band * 0.5 + 0.5, 0.0, 1.0);
    let low_strength = clamp(params.band_low, 0.0, 2.0);
    let mid_strength = clamp(params.band_mid, 0.0, 2.0);
    let high_strength = clamp(params.band_high, 0.0, 2.0);

    let low_body =
        clamp((low01 - 0.5) * (0.6 + 0.4 * low_strength) + 0.5, 0.0, 1.0);
    var composed = mix(0.5, low_body, clamp(0.2 + low_strength * 0.4, 0.0, 1.0));

    let mid_delta = (mid01 - 0.5) * (0.2 + 0.45 * low01);
    composed = clamp(
        composed + mid_delta * clamp(mid_strength, 0.0, 2.0) * 0.36,
        0.0,
        1.0);

    let edge_focus = 1.0 - clamp(abs(composed - 0.5) * 2.0, 0.0, 1.0);
    let edge_gate = edge_focus * edge_focus;
    let high_delta = (high01 - 0.5) * (0.04 + 0.42 * edge_gate + 0.18 * low01);
    composed = clamp(composed + high_delta * high_strength * 0.32, 0.0, 1.0);
    return composed * 2.0 - 1.0;
}

fn gain_curve(value: f32, gain: f32) -> f32 {
    let x = clamp(value, 0.0, 1.0);
    let g = max(gain, 0.0001);
    if (abs(g - 1.0) <= 1e-5) { return x; }
    if (x < 0.5) { return 0.5 * pow(2.0 * x, g); }
    return 1.0 - 0.5 * pow(2.0 * (1.0 - x), g);
}

fn evolution_drift_3d() -> vec3<f32> {
    if (abs(params.evolution_rate) <= 1e-5) {
        return vec3<f32>(0.0, 0.0, 0.0);
    }
    let seed_vec = hash33(vec3<f32>(
        params.seed + 13.0,
        params.secondary_seed + 29.0,
        params.seed * 0.17 + params.secondary_seed * 0.11 + 7.0));
    let base_dir = normalize(seed_vec * 2.0 - 1.0 + vec3<f32>(0.35, 0.22, 0.58));
    return base_dir * (params.evolution_rate * 1.4);
}

fn variation_offset(octave: i32) -> vec3<f32> {
    if (params.variation <= 1e-5) {
        return vec3<f32>(0.0, 0.0, 0.0);
    }

    let base_seed = params.seed;
    let shared_offset = hash33(vec3<f32>(base_seed, base_seed + 11.0, base_seed + 23.0)) * 2.0 - 1.0;
    let octave_seed = base_seed + f32(octave) * 19.19;
    let per_octave = hash33(vec3<f32>(octave_seed, octave_seed + 7.0, octave_seed + 29.0)) * 2.0 - 1.0;
    let blended_offset = mix(per_octave, shared_offset, clamp(params.coherence, 0.0, 1.0));
    return blended_offset * (params.variation * 5.5);
}

fn apply_motion(pos: vec3<f32>) -> vec3<f32> {
    var sample_pos = pos;
    if (params.motion_mode == 2u || params.motion_mode == 3u) {
        let flowed_xy = sample_pos.xy + params.flow_direction * params.flow_strength * params.time;
        sample_pos = vec3<f32>(flowed_xy, sample_pos.z);
    }
    if (params.motion_mode == 3u) {
        let dir = safe_direction(params.flow_direction);
        let perp = vec2<f32>(-dir.y, dir.x);
        let along = dot(sample_pos.xy, dir);
        let across = dot(sample_pos.xy, perp);
        let streak_scale = 1.0 + max(params.streak_length, 0.0);
        let across_scale = max(0.1, 1.0 - params.anisotropy * 0.85);
        sample_pos = vec3<f32>(dir * (along * streak_scale) + perp * (across * across_scale), sample_pos.z);
    }
    return sample_pos;
}

fn warp_basis(pos: vec3<f32>, axis_seed: f32) -> f32 {
    var value = 0.0;
    var amplitude = 1.0;
    var total = 0.0;
    var frequency = 1.0;
    for (var octave = 0; octave < 3; octave++) {
        let octave_seed = axis_seed + f32(octave) * 19.19;
        let seed = params.secondary_seed * 0.013 + params.seed * 0.007 + octave_seed;
        let q = pos * frequency + vec3<f32>(seed, seed * 1.37 + 17.0, seed * 2.11 - 9.0);
        let simplex_component = simplex_noise_3d(q);
        let perlin_component = perlin_noise_3d(q.yzx * 1.71 + vec3<f32>(13.0, 7.0, 19.0));
        value += (simplex_component * 0.65 + perlin_component * 0.35) * 0.5 * amplitude + 0.5 * amplitude;
        total += amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return clamp(value / max(total, 0.0001), 0.0, 1.0);
}

fn domain_warp(pos: vec3<f32>) -> vec3<f32> {
    let secondary_seed_offset = hash13(params.secondary_seed) * 100.0;
    let visible_scale = clamp(sqrt(max(params.scale, 0.0001)), 0.45, 2.5);
    let local_frequency =
        max(params.warp_scale * (0.9 + params.detail_scale * 0.18), 0.0001);
    let warp_pos = pos * local_frequency;
    if (params.warp_type == 2u) {
        let along_noise =
            warp_basis(warp_pos + vec3<f32>(secondary_seed_offset, 17.0, 0.0), 5.0);
        let across_noise =
            warp_basis(warp_pos + vec3<f32>(secondary_seed_offset + 8.3, 29.0, 0.0), 17.0);
        let dir = safe_direction(params.flow_direction);
        let perp = vec2<f32>(-dir.y, dir.x);
        let along_offset = (along_noise - 0.5) * 1.8 * params.warp_strength * visible_scale;
        let across_offset = (across_noise - 0.5) * 6.4 * params.warp_strength * visible_scale;
        let primary_offset = vec3<f32>(
            dir.x * along_offset + perp.x * across_offset,
            dir.y * along_offset + perp.y * across_offset,
            (across_noise - 0.5) * 0.95 * params.warp_strength * visible_scale);

        let twisted_probe = (pos + primary_offset * 0.35) * (local_frequency * 1.7);
        let twist_noise =
            warp_basis(twisted_probe + vec3<f32>(secondary_seed_offset + 21.7, 41.0, 0.0), 31.0);
        let twist_offset = vec3<f32>(
            perp.x * (twist_noise - 0.5) * 3.2 * params.warp_strength * visible_scale,
            perp.y * (twist_noise - 0.5) * 3.2 * params.warp_strength * visible_scale,
            (twist_noise - 0.5) * 0.55 * params.warp_strength * visible_scale);
        return pos + primary_offset + twist_offset;
    }

    let basis_x = warp_basis(warp_pos + vec3<f32>(secondary_seed_offset + 0.0, 0.0, 0.0), 0.0);
    let basis_y = warp_basis(warp_pos + vec3<f32>(secondary_seed_offset + 5.2, 1.3, 0.0), 11.0);
    let basis_z = warp_basis(warp_pos + vec3<f32>(secondary_seed_offset + 9.1, 3.8, 0.0), 23.0);
    let strength = 8.2 * params.warp_strength * visible_scale;
    let primary_offset = vec3<f32>(
        (basis_x - basis_y) * 0.54 * strength,
        (basis_y - basis_z) * 0.54 * strength,
        (basis_z - basis_x) * 0.42 * strength);
    let secondary_pos = (pos + primary_offset * 0.42) * (local_frequency * 1.9);
    let detail_x = warp_basis(secondary_pos + vec3<f32>(secondary_seed_offset + 13.1, 7.0, 0.0), 37.0);
    let detail_y = warp_basis(secondary_pos + vec3<f32>(secondary_seed_offset + 19.4, 11.0, 0.0), 53.0);
    let detail_z = warp_basis(secondary_pos + vec3<f32>(secondary_seed_offset + 27.6, 17.0, 0.0), 71.0);
    let secondary_offset = vec3<f32>(
        (detail_x - 0.5) * strength * 0.42,
        (detail_y - 0.5) * strength * 0.42,
        (detail_z - 0.5) * strength * 0.3);
    return pos + primary_offset + secondary_offset;
}

fn structure_signal(pos: vec3<f32>) -> f32 {
    var low_value = 0.0;
    var mid_value = 0.0;
    var high_value = 0.0;
    var amplitude = 1.0;
    var frequency = 1.0;
    let seed_offset = vec3<f32>(hash13(params.seed) * 100.0, hash13(params.seed + 1.0) * 100.0, hash13(params.seed + 2.0) * 100.0);
    var p = pos + seed_offset;
    p.z += phase_z_value();
    p += evolution_drift_3d();

    var low_max = 0.0;
    var mid_max = 0.0;
    var high_max = 0.0;
    let roughness_weight = clamp(params.roughness, 0.0, 2.0);

    for (var i = 0; i < params.octaves; i++) {
        let octave_t = clamp(f32(i) / f32(max(params.octaves - 1, 1)), 0.0, 1.0);
        var detail_mix = mix(1.0, params.detail_scale, octave_t);
        let bucket = octave_band_bucket(i, params.octaves);
        if (params.primitive_type == 1u) {
            detail_mix = mix(1.0, max(1.0, params.detail_scale * 0.72), octave_t);
        } else if (params.primitive_type == 2u) {
            detail_mix = mix(1.0, max(1.0, params.detail_scale * 0.68), octave_t);
        }
        let sample_frequency = frequency * detail_mix * max(0.0001, octave_band_scale(i, params.octaves));
        let octave_offset = variation_offset(i);
        var n = primitive_noise_3d((p + octave_offset) * sample_frequency);
        let combined_roughness = max(0.0001, roughness_weight * max(0.0001, octave_band_roughness(i, params.octaves)));
        let band_weight = mix(1.0, pow(combined_roughness, octave_t), octave_t);
        if (params.primitive_type == 1u && bucket == 2) {
            n = mix(n, perlin_noise_3d((p + octave_offset) * sample_frequency * 0.72), 0.45);
        } else if (params.primitive_type == 2u && bucket >= 1) {
            n = mix(n, value_cubic_noise_3d((p + octave_offset) * sample_frequency * 0.66), 0.55);
        }

        switch params.fractal_mode {
            case 1u: { n = pow(1.0 - abs(n), 2.0); }
            case 2u: { n = abs(n) * 2.0 - 1.0; }
            case 3u: { n = abs(n); }
            default: {}
        }

        var weighted_amplitude = amplitude * band_weight;
        if (params.primitive_type == 1u && bucket == 2) {
            weighted_amplitude *= 0.62;
        } else if (params.primitive_type == 2u && bucket == 1) {
            weighted_amplitude *= 0.84;
        } else if (params.primitive_type == 2u && bucket == 2) {
            weighted_amplitude *= 0.52;
        }
        switch bucket {
            case 0: { low_value += weighted_amplitude * n; low_max += weighted_amplitude; }
            case 1: { mid_value += weighted_amplitude * n; mid_max += weighted_amplitude; }
            default: { high_value += weighted_amplitude * n; high_max += weighted_amplitude; }
        }
        frequency *= params.lacunarity;
        amplitude *= params.gain;
    }

    var value = compose_band_field(
        low_value / max(low_max, 0.0001),
        mid_value / max(mid_max, 0.0001),
        high_value / max(high_max, 0.0001));
    value *= params.amplitude;
    if (params.absolute == 1u) { value = abs(value); }
    if (params.fractal_mode != 1u && params.fractal_mode != 3u && params.absolute == 0u) {
        value = value * 0.5 + 0.5;
    }
    return clamp(value, 0.0, 1.0);
}

fn composed_structure_signal(base_pos: vec3<f32>) -> f32 {
    return structure_signal(base_pos);
}

fn shape_field_value(raw_value: f32) -> f32 {
    var value = clamp(raw_value, 0.0, 1.0);
    if (params.invert == 1u) { value = 1.0 - value; }
    value = (value - 0.5) * params.contrast + 0.5 + params.brightness;
    value = gain_curve(value, params.shape_gain);
    if (params.threshold_high > params.threshold_low) {
        value = smoothstep(params.threshold_low, params.threshold_high, value);
    }
    return clamp(value, params.clamp_low, params.clamp_high);
}

fn interpret_output_value(shaped_value: f32) -> f32 {
    let value = clamp(shaped_value, 0.0, 1.0);
    if (params.output_type == 3u) {
        return select(0.0, 1.0, value >= 0.5);
    }
    let detail_focus =
        clamp(params.band_high * 0.26 + (params.detail_scale - 1.0) * 0.16 + params.roughness * 0.12,
              0.0,
              1.0);
    if (params.output_type == 4u) {
        return clamp(abs(value - 0.5) * (1.35 + detail_focus * 1.65), 0.0, 1.0);
    }
    if (params.output_type == 5u) {
        let activity_focus =
            clamp(params.flow_strength * 0.10 + params.warp_strength * 0.12 +
                  params.band_mid * 0.10 + detail_focus * 0.24,
                  0.0,
                  1.0);
        return clamp(pow(value, mix(1.0, 0.58, activity_focus)) * (0.66 + activity_focus * 0.42) +
                     activity_focus * 0.18,
                     0.0,
                     1.0);
    }
    return value;
}

fn sample_field(world_pos: vec3<f32>) -> f32 {
    var sample_pos = apply_motion(world_pos);
    if (params.warp_strength > 0.0) {
        sample_pos = domain_warp(sample_pos);
    }
    return interpret_output_value(shape_field_value(composed_structure_signal(sample_pos)));
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let dim = textureDimensions(output_tex);
    if (id.x >= dim.x || id.y >= dim.y) {
        return;
    }

    let uv = (vec2<f32>(id.xy) + vec2<f32>(0.5, 0.5)) / vec2<f32>(dim);
    let sample_scale = max(params.scale, 0.0001);
    let world_pos = world_position_from_uv(uv, sample_scale);
    let noise_value = sample_field(world_pos);
    let alpha = select(1.0, noise_value, params.output_type == 1u);
    textureStore(output_tex, id.xy, vec4<f32>(vec3<f32>(noise_value), alpha));
}
