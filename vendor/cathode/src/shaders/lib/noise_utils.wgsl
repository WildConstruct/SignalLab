fn cathodeHash31(v : vec3<u32>) -> f32 {
  var x = v.x * 1664525u + 1013904223u;
  x = x ^ (v.y * 22695477u + 1u);
  x = x ^ (v.z * 1103515245u + 12345u);
  return f32(x & 65535u) / 65535.0;
}
