$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $projectRoot '.cache/ms-playwright'
node scripts/export-renders.mjs
if ($LASTEXITCODE -ne 0) { throw 'Render export failed. Check the local server and test browser installation.' }
