# Cathode Vendored Snapshot

Source repository: `WildConstruct/cathode`

Base commit: `168e5fd569a6f18a212c1de7eb28b7511af7f05b`

Snapshot contents:

- `src/shaders/signal/composite_decode.wgsl`
- `src/shaders/display/crt_mask_beam.wgsl`
- `src/shaders/lib/math_utils.wgsl`
- `src/shaders/lib/noise_utils.wgsl`
- `include/cathode/cathode_signal_pass.h`
- `include/cathode/cathode_display_pass.h`
- `include/cathode/cathode_render_types.h`
- `src/cathode/cathode_signal_pass.cpp`
- `src/cathode/cathode_display_pass.cpp`

Note: this snapshot intentionally uses the current Cathode working tree, not a
clean commit. The working tree includes local edits to:

- `src/shaders/display/crt_mask_beam.wgsl`
- `src/cathode/cathode_display_pass.cpp`
- `include/cathode/cathode_render_types.h`

Those edits add display phosphor mode plumbing used by the CRT display pass.
