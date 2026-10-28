param([string]$Go = 'go')
$ErrorActionPreference = 'Stop'
$taskSourceRoot = Split-Path $PSScriptRoot -Parent
Push-Location $taskSourceRoot
try {
    npm ci --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Root dependency install failed' }
    node scripts/prepare-engine.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Engine preparation failed' }
    npm --prefix web ci --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Web dependency install failed' }
    npm --prefix web run build
    if ($LASTEXITCODE -ne 0) { throw 'UI build failed' }
    New-Item -ItemType Directory -Force -Path dist | Out-Null
    & $Go build -trimpath -o dist/MyRemote.exe ./cmd/my-remote
    if ($LASTEXITCODE -ne 0) { throw 'Native build failed' }
    Write-Host 'Built development executable. See docs/acceptance.md before packaging.'
} finally { Pop-Location }
