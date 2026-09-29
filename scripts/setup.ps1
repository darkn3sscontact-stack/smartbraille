param([string]$Python = 'python', [switch]$SkipModel, [switch]$SkipVoice, [switch]$SkipBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
function Check-Exit([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE" } }
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'Install Node.js 22.12+ (64-bit, including npm) and reopen PowerShell first.'
}
if (-not (Test-Path '.venv/Scripts/python.exe')) {
    & $Python -c "import sys; assert sys.version_info[:2] == (3, 12), 'Use Python 3.12 for the pinned Windows dependencies'; assert sys.maxsize > 2**32, 'Use 64-bit Python'"
    Check-Exit 'Python version check'
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv venv .venv --python $Python --cache-dir .cache/uv
    } else { & $Python -m venv .venv }
    Check-Exit 'Virtual environment'
}
if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv pip install --python .venv/Scripts/python.exe -r server/requirements.txt --cache-dir .cache/uv
} else { & .venv/Scripts/python.exe -m pip install -r server/requirements.txt }
Check-Exit 'Python dependencies'
if (-not (Test-Path '.env')) { Copy-Item -LiteralPath .env.example -Destination .env }
& .venv/Scripts/python.exe scripts/generate-mapping.py
Check-Exit 'Mapping generation'
Push-Location web
try { npm.cmd ci --cache ../.cache/npm; Check-Exit 'Frontend dependencies' } finally { Pop-Location }
if (-not $SkipVoice) { & .venv/Scripts/python.exe scripts/download-voice.py; Check-Exit 'Neural voice download' }
if (-not $SkipModel) { & .venv/Scripts/python.exe scripts/download-model.py; Check-Exit 'Model download' }
if (-not $SkipBrowser) {
    $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $projectRoot '.cache/ms-playwright'
    & web/node_modules/.bin/playwright.cmd install chromium
    Check-Exit 'Test browser'
}
& "$PSScriptRoot/build.ps1"
Write-Host 'Setup complete. Run: .\scripts\start.ps1'
