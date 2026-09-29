[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$Domain,
    [ValidateRange(1024,65535)][int]$Port = 8000
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$Domain = $Domain.Trim().ToLowerInvariant()
if ([Uri]::CheckHostName($Domain) -ne [UriHostNameType]::Dns -or
    $Domain -notmatch '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$' -or
    $Domain -notmatch '\.' -or $Domain.EndsWith('.localhost')) {
    throw 'Supply a public DNS hostname only, such as your-name.duckdns.org (no https://, path, port or IP address).'
}
if (-not $PSCmdlet.ShouldProcess($projectRoot, "Configure HTTPS host $Domain and private backend port $Port")) { return }
$runtime = Join-Path $projectRoot 'deploy/runtime'
$logs = Join-Path $runtime 'logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $runtime 'caddy-data') -Force | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Utf8([string]$Path, [string]$Content) { [IO.File]::WriteAllText($Path, $Content, $utf8) }
$envPath = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $envPath) {
    $settings = [IO.File]::ReadAllText($envPath)
} else {
    $settings = [IO.File]::ReadAllText((Join-Path $projectRoot '.env.example'))
}
$values = [ordered]@{
    ALLOWED_ORIGINS = "https://$Domain,http://127.0.0.1:$Port,http://localhost:$Port"
    PUBLIC_BASE_URL = "https://$Domain"
    PUBLIC_URL_VERIFIED = 'false'
}
foreach ($key in $values.Keys) {
    $pattern = '(?m)^' + [regex]::Escape($key) + '=.*$'
    $line = $key + '=' + $values[$key]
    if ([regex]::IsMatch($settings, $pattern)) { $settings = [regex]::Replace($settings, $pattern, $line) }
    else { $settings = $settings.TrimEnd() + "`r`n$line`r`n" }
}
Write-Utf8 $envPath $settings
$caddyRoot = $runtime.Replace('\','/')
$caddyfile = @"
{
    storage file_system {
        root "$caddyRoot/caddy-data"
    }
    log {
        output file "$caddyRoot/logs/caddy.log" {
            roll_size 10MiB
            roll_keep 5
        }
    }
}

$Domain {
    request_body {
        max_size 7MB
    }
    encode zstd gzip
    reverse_proxy 127.0.0.1:$Port
}
"@
Write-Utf8 (Join-Path $runtime 'Caddyfile') $caddyfile
$logging = @{
    version = 1
    disable_existing_loggers = $false
    formatters = @{ standard = @{ format = '%(asctime)s %(levelname)s %(name)s %(message)s' } }
    handlers = @{ file = @{
        class = 'logging.handlers.RotatingFileHandler'
        filename = (Join-Path $logs 'app.log')
        maxBytes = 10485760
        backupCount = 5
        encoding = 'utf-8'
        formatter = 'standard'
    } }
    root = @{ handlers = @('file'); level = 'INFO' }
    loggers = @{
        uvicorn = @{ handlers = @('file'); level = 'INFO'; propagate = $false }
        'uvicorn.error' = @{ level = 'INFO' }
        'uvicorn.access' = @{ handlers = @(); propagate = $false }
    }
}
Write-Utf8 (Join-Path $runtime 'logging.json') ($logging | ConvertTo-Json -Depth 8)
Write-Utf8 (Join-Path $runtime 'deployment.json') (@{ domain = $Domain; port = $Port } | ConvertTo-Json)
Write-Host "Configured https://$Domain. Files are in deploy/runtime (excluded from Git)."
Write-Host 'Existing tasks must be restarted after configuration changes. Changing the port requires reinstalling the tasks.'
Write-Host 'PUBLIC_URL_VERIFIED remains false until external HTTPS and microphone checks pass.'
