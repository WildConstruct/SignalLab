param(
  [Parameter(Mandatory = $true)]
  [string]$DawnSourceDir,
  [string]$BuildDir = "build-dawn-runtime"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $DawnSourceDir)) {
  throw "DawnSourceDir does not exist: $DawnSourceDir"
}

$repo = Split-Path -Parent $PSScriptRoot
Push-Location $repo
try {
  cmake -S . -B $BuildDir `
    -DIAN_BUILD_SIGNALRACK_DAWN_RUNTIME=ON `
    -DIAN_DAWN_SOURCE_DIR="$DawnSourceDir"
  cmake --build $BuildDir --target signal_smoke

  $exe = Get-ChildItem -Path $BuildDir -Recurse -Filter signal_smoke.exe |
    Select-Object -First 1
  if (!$exe) {
    throw "signal_smoke.exe was not produced under $BuildDir"
  }
  & $exe.FullName
} finally {
  Pop-Location
}
