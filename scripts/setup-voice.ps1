$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$voiceFolder = Join-Path $projectRoot 'tools/espeak-ng'
$binary = Join-Path $voiceFolder 'espeak-ng.exe'
if (-not (Test-Path -LiteralPath $binary)) {
    New-Item -ItemType Directory -Force tools | Out-Null
    $msiPath = Join-Path $projectRoot 'tools/espeak-ng.msi'
    Invoke-WebRequest 'https://github.com/espeak-ng/espeak-ng/releases/download/1.52.0/espeak-ng.msi' -OutFile $msiPath
    $expected = '7F673C709EA5DD579D3B5EBB98688CC575328A6AB7438D2BC405B88CEDAEAFB9'
    if ((Get-FileHash -LiteralPath $msiPath -Algorithm SHA256).Hash -ne $expected) { throw 'eSpeak NG package checksum mismatch' }
    $extractFolder = Join-Path $projectRoot 'tools/espeak-extract'
    New-Item -ItemType Directory -Force $extractFolder | Out-Null
    $process = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/a', ('"'+$msiPath+'"'), '/qn', ('TARGETDIR="'+$extractFolder+'"')) -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "eSpeak extraction failed: $($process.ExitCode)" }
    Copy-Item -LiteralPath (Join-Path $extractFolder 'eSpeak NG') -Destination $voiceFolder -Recurse -Force
}
& .venv/Scripts/python.exe -c "import os; os.environ['TTS_ENGINE']='espeak'; from server import app; app.find_voice(); print('Georgian voice available:', app.voice_available); raise SystemExit(0 if app.voice_available else 1)"
if ($LASTEXITCODE -ne 0) { throw 'eSpeak Georgian voice check failed' }
