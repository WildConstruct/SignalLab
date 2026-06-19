# SignalRackPlugin — After Effects effect (NOT YET BUILDABLE)
# Requires the Adobe After Effects SDK and a Dawn tree. Guarded so the rest of
# the project (engine logic, core contract, codegen) builds without the SDK.
cmake_minimum_required(VERSION 3.21)

set(AE_SDK "" CACHE PATH "Path to the Adobe After Effects SDK (Headers dir)")

if(NOT AE_SDK)
    message(STATUS "SignalRackPlugin: AE_SDK not set — skipping plugin target. "
                   "Set -DAE_SDK=/path/to/AE_SDK/Examples/Headers to build it.")
    return()
endif()

if(NOT TARGET signalrack_runtime)
    message(STATUS "SignalRackPlugin: signalrack_runtime target not present - skipping plugin target.")
    return()
endif()

add_library(SignalRackPlugin MODULE
    SignalRackPlugin.cpp
    src/backend/WebGpuBackend.cpp)

target_include_directories(SignalRackPlugin PRIVATE
    "${AE_SDK}"
    "${CMAKE_CURRENT_SOURCE_DIR}/src"
    "${CMAKE_SOURCE_DIR}/include"
    "${CMAKE_SOURCE_DIR}")

# WebGPU/Dawn is the only backend; define SIGNALRACK_HAS_DAWN only when linked.
target_link_libraries(SignalRackPlugin PRIVATE signalrack_runtime)
target_compile_definitions(SignalRackPlugin PRIVATE SIGNALRACK_HAS_DAWN=1)

set_target_properties(SignalRackPlugin PROPERTIES
    SUFFIX ".aex"          # Windows; use ".plugin" bundle on macOS
    PREFIX "")
