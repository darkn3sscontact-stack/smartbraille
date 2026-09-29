param([int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
if (-not (Test-Path '.venv/Scripts/python.exe')) { throw 'Run scripts/setup.ps1 first.' }
if (-not (Test-Path 'web/dist/index.html')) { & "$PSScriptRoot/build.ps1" }
Write-Host "Braille local demo: http://127.0.0.1:$Port"
Write-Host 'Keep this terminal open. Ctrl+C stops the service. Microphone requires localhost or HTTPS.'
& .venv/Scripts/python.exe -m uvicorn server.app:app --host 127.0.0.1 --port $Port --workers 1 --proxy-headers --forwarded-allow-ips 127.0.0.1
if ($LASTEXITCODE -ne 0) { throw "Server stopped with exit code $LASTEXITCODE" }
