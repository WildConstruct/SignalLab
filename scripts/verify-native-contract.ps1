param(
  [string]$BuildDir = "build-native-contract"
)

$ErrorActionPreference = "Stop"

function Find-CxxCompiler {
  foreach ($name in @("cl.exe", "g++.exe", "clang++.exe")) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  return $null
}

$repo = Split-Path -Parent $PSScriptRoot
Push-Location $repo
try {
  node prototypes\webgpu-lab\validate.js
  node prototypes\webgpu-lab\codec-validate.js

  $compiler = Find-CxxCompiler
  if (!$compiler) {
    throw "No C++ compiler found on PATH. Install Visual Studio Build Tools, g++, or clang++ to run the host-free native contract tier."
  }

  cmake -S . -B $BuildDir -DIAN_BUILD_SIGNALRACK_DAWN_RUNTIME=OFF
  cmake --build $BuildDir --target core_contract_test value_codec_test ae_bake_contract_test live_courier_strip_test
  ctest --test-dir $BuildDir --output-on-failure
} finally {
  Pop-Location
}
