$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
Copy-Item -LiteralPath 'data/ka.utb' -Destination 'web/public/documents/ka.utb'
Copy-Item -LiteralPath 'data/LIBLOUIS-LICENSE.txt' -Destination 'web/public/documents/LIBLOUIS-LICENSE.txt'
if (Test-Path 'docs/THIRD_PARTY_NOTICES.md') { Copy-Item -LiteralPath 'docs/THIRD_PARTY_NOTICES.md' -Destination 'web/public/documents/THIRD_PARTY_NOTICES.md' }
if (Test-Path 'docs/licenses') { Copy-Item -LiteralPath 'docs/licenses' -Destination 'web/public/documents/' -Recurse -Force }
Push-Location web
try { npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' } } finally { Pop-Location }
