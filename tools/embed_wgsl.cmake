# Generate a C++ header exposing a .wgsl file as a const char* raw-string.
# Usage (script mode):
#   cmake -DWGSL_IN=in.wgsl -DWGSL_OUT=out.h -DWGSL_SYMBOL=kSignalCoreWgsl -P embed_wgsl.cmake
file(READ "${WGSL_IN}" _src)
# Use a raw string literal with a delimiter unlikely to collide with WGSL.
set(_content "// Generated from ${WGSL_IN}. Do not edit.\n#pragma once\n")
string(APPEND _content "inline constexpr char ${WGSL_SYMBOL}[] = R\"WGSL(\n")
string(APPEND _content "${_src}")
string(APPEND _content ")WGSL\";\n")
file(WRITE "${WGSL_OUT}" "${_content}")
