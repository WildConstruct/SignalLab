# =============================================================================
#  Signal Rack — Wild Construct
#  WebGPU-first signal engine exposed natively through the Dawn bridge.
#  Conventions follow ethera-etheros (namespace ItsAllNoise, IAN_ options,
#  modular WGSL as canonical source, WebGPU/Dawn as the only backend).
# =============================================================================
cmake_minimum_required(VERSION 3.21)
project(SignalRack CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

option(IAN_BUILD_SIGNALRACK_AE_SURFACE "Build the thin Signal Rack After Effects-facing surface" ON)
option(IAN_USE_EXTERNAL_DAWN           "Use an external Dawn installation"                        OFF)
option(IAN_EMBED_WGSL                  "Embed WGSL shaders in the binary"                         ON)
set(IAN_DAWN_SOURCE_DIR "" CACHE PATH "Path to a Dawn source tree (vendored or external)")

# --- embed shaders/signal_core.wgsl -> generated/signal_core_wgsl.h ----------
# Mirrors Etheros IAN_EMBED_WGSL: modular WGSL is the canonical product source;
# the build turns it into a C string so the runtime needs no shader files.
set(_gen_dir "${CMAKE_BINARY_DIR}/generated")
file(MAKE_DIRECTORY "${_gen_dir}")
set(_wgsl "${CMAKE_CURRENT_SOURCE_DIR}/shaders/signal_core.wgsl")
set(_wgsl_hdr "${_gen_dir}/signal_core_wgsl.h")

add_custom_command(
    OUTPUT  "${_wgsl_hdr}"
    COMMAND ${CMAKE_COMMAND}
            -DWGSL_IN=${_wgsl}
            -DWGSL_OUT=${_wgsl_hdr}
            -DWGSL_SYMBOL=kSignalCoreWgsl
            -P "${CMAKE_CURRENT_SOURCE_DIR}/tools/embed_wgsl.cmake"
    DEPENDS "${_wgsl}" "${CMAKE_CURRENT_SOURCE_DIR}/tools/embed_wgsl.cmake"
    COMMENT "Embedding signal_core.wgsl"
    VERBATIM)

# --- core (header-only, CPU-testable) ----------------------------------------
add_library(signalrack_core INTERFACE)
target_include_directories(signalrack_core INTERFACE
    "${CMAKE_CURRENT_SOURCE_DIR}/include"
    "${CMAKE_CURRENT_SOURCE_DIR}")

# --- dawn runtime (requires a Dawn target named dawn::webgpu_dawn) ------------
add_library(signalrack_runtime STATIC
    runtime/dawn/signal_runtime.cpp
    runtime/dawn/signal_dawn_bridge.cpp
    "${_wgsl_hdr}")
target_include_directories(signalrack_runtime PUBLIC
    "${CMAKE_CURRENT_SOURCE_DIR}/include"
    "${CMAKE_CURRENT_SOURCE_DIR}"
    "${_gen_dir}")
target_link_libraries(signalrack_runtime PUBLIC signalrack_core)

if(IAN_DAWN_SOURCE_DIR)
    message(STATUS "SignalRack: using Dawn source tree at ${IAN_DAWN_SOURCE_DIR}")
    add_subdirectory("${IAN_DAWN_SOURCE_DIR}" "${CMAKE_BINARY_DIR}/dawn" EXCLUDE_FROM_ALL)
    target_link_libraries(signalrack_runtime PUBLIC dawn::webgpu_dawn)
elseif(IAN_USE_EXTERNAL_DAWN)
    find_package(Dawn REQUIRED)
    target_link_libraries(signalrack_runtime PUBLIC dawn::webgpu_dawn)
else()
    message(WARNING
        "No Dawn source configured. Set IAN_DAWN_SOURCE_DIR or IAN_USE_EXTERNAL_DAWN, "
        "or vendor third_party/dawn before building signalrack_runtime. WebGPU/Dawn is "
        "the only supported backend; there is no CPU fallback.")
endif()

# --- examples / smoke --------------------------------------------------------
add_executable(signal_smoke examples/signal_smoke.cpp)
target_link_libraries(signal_smoke PRIVATE signalrack_runtime)
