$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$folder = Join-Path $projectRoot 'tools/caddy'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$archive = Join-Path $folder 'caddy_2.11.4_windows_amd64.zip'
$expected = 'cd5ccfd86a4b40732cf715890d0dca5bf3f63adefec5a7914de85adf240c60ce7e5d2791631b88ef9758e46b23bb1730e020b9c5d696889740b284ffd4788e35'
Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/caddyserver/caddy/releases/download/v2.11.4/caddy_2.11.4_windows_amd64.zip' -OutFile $archive
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA512).Hash.ToLowerInvariant() -ne $expected) {
    throw 'Caddy checksum mismatch. The archive has not been extracted.'
}
Expand-Archive -LiteralPath $archive -DestinationPath $folder -Force
& (Join-Path $folder 'caddy.exe') version
if ($LASTEXITCODE -ne 0) { throw 'Caddy could not run.' }
