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
option(IAN_BUILD_SIGNALRACK_DAWN_RUNTIME "Build the Dawn-backed Signal Rack runtime and signal_smoke" OFF)
option(IAN_EMBED_WGSL                  "Embed WGSL shaders in the binary"                         ON)
set(IAN_DAWN_SOURCE_DIR "" CACHE PATH "Path to a Dawn source tree (vendored or external)")

include(CTest)

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

add_executable(core_contract_test examples/core_contract_test.cpp)
target_link_libraries(core_contract_test PRIVATE signalrack_core)
add_test(NAME core_contract_test COMMAND core_contract_test)

add_executable(value_codec_test examples/value_codec_test.cpp)
target_link_libraries(value_codec_test PRIVATE signalrack_core)
add_test(NAME value_codec_test COMMAND value_codec_test)

add_executable(ae_bake_contract_test examples/ae_bake_contract_test.cpp)
target_link_libraries(ae_bake_contract_test PRIVATE signalrack_core)
add_test(NAME ae_bake_contract_test COMMAND ae_bake_contract_test)

add_executable(live_courier_strip_test examples/live_courier_strip_test.cpp)
target_link_libraries(live_courier_strip_test PRIVATE signalrack_core)
add_test(NAME live_courier_strip_test COMMAND live_courier_strip_test)

# --- dawn runtime (requires a Dawn target named dawn::webgpu_dawn) ------------
if(IAN_BUILD_SIGNALRACK_DAWN_RUNTIME)
    if(NOT IAN_DAWN_SOURCE_DIR AND NOT IAN_USE_EXTERNAL_DAWN)
        message(FATAL_ERROR
            "IAN_BUILD_SIGNALRACK_DAWN_RUNTIME=ON requires IAN_DAWN_SOURCE_DIR "
            "or IAN_USE_EXTERNAL_DAWN=ON. Signal Rack native runtime has no CPU fallback.")
    endif()

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
    endif()

    # --- examples / smoke ----------------------------------------------------
    add_executable(signal_smoke examples/signal_smoke.cpp)
    target_link_libraries(signal_smoke PRIVATE signalrack_runtime)
    add_test(NAME signal_smoke COMMAND signal_smoke)
else()
    message(STATUS
        "SignalRack: skipping Dawn runtime. Set IAN_BUILD_SIGNALRACK_DAWN_RUNTIME=ON "
        "with IAN_DAWN_SOURCE_DIR or IAN_USE_EXTERNAL_DAWN to build signal_smoke.")
endif()

if(IAN_BUILD_SIGNALRACK_AE_SURFACE)
    add_subdirectory(plugin/SignalRackPlugin)
endif()
