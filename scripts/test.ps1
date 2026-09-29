$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
& .venv/Scripts/python.exe -m pytest server/test_app.py -q
if ($LASTEXITCODE -ne 0) { throw 'API tests failed' }
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $projectRoot '.cache/ms-playwright'
Push-Location web
try {
    npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Unit tests failed' }
    npm.cmd run test:browser
    if ($LASTEXITCODE -ne 0) { throw 'Browser tests failed. Start the local service first.' }
} finally { Pop-Location }
