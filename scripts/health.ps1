param([int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$health = Invoke-RestMethod "http://127.0.0.1:$Port/api/health"
$health | ConvertTo-Json
if ($health.model_state -ne 'ready') { throw 'Speech model not ready. Check .env and run scripts/download-model.py.' }
if (-not $health.voice_available) { Write-Warning 'Local Georgian voice unavailable. Run scripts/setup-voice.ps1.' }
