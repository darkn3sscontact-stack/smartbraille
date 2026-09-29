[CmdletBinding(SupportsShouldProcess, ConfirmImpact='Medium')]
param([string]$CaddyPath, [switch]$OpenFirewall, [switch]$Replace)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $projectRoot 'deploy/runtime'
$python = Join-Path $projectRoot '.venv/Scripts/python.exe'
if (-not $CaddyPath) { $CaddyPath = Join-Path $projectRoot 'tools/caddy/caddy.exe' }
foreach ($path in @($python, $CaddyPath, (Join-Path $runtime 'deployment.json'),
    (Join-Path $runtime 'logging.json'), (Join-Path $runtime 'Caddyfile'),
    (Join-Path $projectRoot 'web/dist/index.html'))) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing $path. Complete setup and configure-windows-server.ps1 first." }
}
$CaddyPath = (Resolve-Path -LiteralPath $CaddyPath).Path
$configuration = Get-Content -LiteralPath (Join-Path $runtime 'deployment.json') -Raw | ConvertFrom-Json
$port = [int]$configuration.port
if ($port -lt 1024 -or $port -gt 65535) { throw 'Invalid backend port in deployment.json.' }
$taskNames = @('SmartBraille-App','SmartBraille-HTTPS')
foreach ($taskName in $taskNames) {
    if ((Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) -and -not $Replace) {
        throw "$taskName already exists. Use -Replace to stop and replace this project's tasks."
    }
}
if (-not $PSCmdlet.ShouldProcess($projectRoot, 'Install and start SmartBraille startup tasks as LOCAL SERVICE')) { return }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principalCheck = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principalCheck.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this installer in PowerShell as Administrator on the target Windows Server.'
}
& $CaddyPath validate --config (Join-Path $runtime 'Caddyfile') --adapter caddyfile
if ($LASTEXITCODE -ne 0) { throw 'Caddy configuration validation failed.' }

# Give the built-in, unprivileged service account read access to the checkout;
# only logs and certificate state need write access. SIDs work on localized Windows.
& icacls.exe $projectRoot /grant '*S-1-5-19:(OI)(CI)RX'
if ($LASTEXITCODE -ne 0) { throw 'Cannot grant LOCAL SERVICE read access.' }
& icacls.exe $runtime /grant '*S-1-5-19:(OI)(CI)M'
if ($LASTEXITCODE -ne 0) { throw 'Cannot grant LOCAL SERVICE runtime access.' }
# A separately installed Caddy executable must also be readable/executable.
& icacls.exe $CaddyPath /grant '*S-1-5-19:RX'
if ($LASTEXITCODE -ne 0) { throw 'Cannot grant Caddy execute access.' }

$principal = New-ScheduledTaskPrincipal -UserId 'S-1-5-19' -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable `
    -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$appArgs = '-m uvicorn server.app:app --host 127.0.0.1 --port {0} --workers 1 --proxy-headers --forwarded-allow-ips 127.0.0.1 --no-access-log --log-config "{1}"' -f $port, (Join-Path $runtime 'logging.json')
$proxyArgs = 'run --config "{0}" --adapter caddyfile' -f (Join-Path $runtime 'Caddyfile')
$actions = @(
    (New-ScheduledTaskAction -Execute $python -Argument $appArgs -WorkingDirectory $projectRoot),
    (New-ScheduledTaskAction -Execute $CaddyPath -Argument $proxyArgs -WorkingDirectory $projectRoot)
)
for ($i = 0; $i -lt $taskNames.Count; $i++) {
    $existing = Get-ScheduledTask -TaskName $taskNames[$i] -ErrorAction SilentlyContinue
    if ($existing) {
        Stop-ScheduledTask -TaskName $taskNames[$i]
        $deadline = (Get-Date).AddSeconds(30)
        while ((Get-ScheduledTask -TaskName $taskNames[$i]).State -eq 'Running') {
            if ((Get-Date) -gt $deadline) { throw 'Existing task did not stop; inspect Task Scheduler before retrying.' }
            Start-Sleep -Milliseconds 250
        }
    }
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $trigger.Delay = 'PT15S'
    Register-ScheduledTask -TaskName $taskNames[$i] -Action $actions[$i] -Trigger $trigger `
        -Principal $principal -Settings $settings -Description 'SmartBraille Windows Server hosting' -Force | Out-Null
}
if ($OpenFirewall) {
    if (-not (Get-NetFirewallRule -Name 'SmartBraille-Web' -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -Name 'SmartBraille-Web' -DisplayName 'SmartBraille HTTPS and certificate renewal' `
            -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80,443 -Program $CaddyPath | Out-Null
    }
}
foreach ($taskName in $taskNames) { Start-ScheduledTask -TaskName $taskName }
Write-Host 'Startup tasks installed. Check deploy/runtime/logs and /api/health; model loading takes time.'
Write-Host 'Router forwarding, public DNS and a second-device HTTPS test are still required.'
