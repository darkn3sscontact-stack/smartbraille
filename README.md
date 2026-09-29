# SmartBraille — Georgian Braille learning platform

An interactive Georgian-language website for learning Braille and exploring a six-dot tactile device. This repository contains the complete React frontend, Python speech backend, and native Windows Server deployment scripts.

**To put the site online:** clone this repository onto the Windows Server, install/build it, point a public domain at the home connection, and run the included HTTPS setup. Visitors only need the resulting `https://YOUR-DOMAIN` link. They do not install Python, Node or any model.

Jump to: [device compatibility](#device-and-browser-compatibility) · [server installation](#2-clone-install-and-test-locally) · [domain and DNS](#3-public-hostname-and-home-network) · [public HTTPS launch](#4-configure-https-and-automatic-startup) · [external verification](#5-verify-from-outside-the-house).

## Features

- Verified conversion of the 33 modern Georgian letters into six-dot Braille.
- Letter and word playback, Georgian narration, and browser-generated solenoid sounds.
- Reading and dot-building exercises, session results, JSON/CSV exports.
- Georgian microphone transcription using a locally installed Whisper model.
- Georgian speech synthesis using Piper on the server, without Windows speech voices.
- Interactive 3D device explorer, animated components, original CAD renders and image exports.
- Georgian interface, keyboard controls, accessibility settings and diagnostics.
- [13-page printable jury guide](output/pdf/SmartBraille_Jury_Guide_KA.pdf).

The 3D model demonstrates the mechanism; this software does not drive physical motors or solenoids. Quiz history stays in each visitor's browser. Microphone audio is processed in memory and is not saved by the API. No database or cloud speech API key is needed.

## Device and browser compatibility

The visitor interface adapts to small phones, portrait/landscape tablets, laptops and large monitors. It includes safe-area spacing for notched phones, 44px touch controls, readable mobile forms, wrapping toolbars, scrollable result tables and dialogs that fit short screens. Pinch zoom remains available.

| Visitor device | Recommended browser |
|---|---|
| iPhone / iPad | Current Safari; open the public HTTPS link directly |
| Android phone / tablet | Current Chrome or Firefox |
| Windows | Current Edge, Chrome or Firefox |
| macOS | Current Safari, Chrome or Firefox |
| Linux | Current Firefox or Chrome/Chromium |

The **server** instructions below are for Windows Server; the **visitor** can use any of the platforms above. Automated checks use Chromium, Firefox and WebKit with desktop, Android, iPhone and iPad profiles. Emulation is not a physical-device or operating-system certification. Real iPhone/Android microphone and playback checks are part of the launch checklist.

Open the link in a normal browser instead of a messaging app's embedded browser if microphone access or downloads are blocked. Audio starts after a user action; enable sound using the site's controls. If WebGL is unavailable, the site retains its 2D Braille cells and original device images. Microphone use requires trusted HTTPS and permission; the typed-input path remains available.

## Windows Server handoff

```text
Judge's phone / computer
        | HTTPS, public hostname
Home router: forward TCP 80 and 443 to Windows Server
        |
Caddy: certificates + HTTPS reverse proxy
        | private loopback connection
127.0.0.1:8000 — FastAPI + built React site + Whisper + Piper
```

All website files and speech processing run on the Windows Server at home. The development computer can be off. The server, router and internet connection must stay on. GitHub stores the source code; it is not the running host.

**Target:** Windows Server 2019/2022/2025 x64, PowerShell 5.1 or newer. Recommended starting hardware: 4 CPU cores, 16 GB RAM, 15 GB free SSD space. These are practical recommendations, not measured minimums. The recognition model downloads about 1.62 GB and the voice about 64 MB. A GPU is optional. One transcription and one speech synthesis run at a time: this setup is intended for a small jury demonstration.

### 1. Install prerequisites on the server

Install **for all users**, outside personal Windows profiles:

- [Git for Windows](https://git-scm.com/downloads/win).
- [Python 3.12 x64](https://www.python.org/downloads/windows/), including pip and venv. The locked dependencies target 3.12.
- [Node.js](https://nodejs.org/en/download) 22.12+ with npm; Node 24 LTS is suitable.
- [Microsoft Visual C++ x64 runtime](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) if native speech libraries report a missing DLL.

Reopen PowerShell after installation. Administrator access is required for registering startup tasks and opening firewall ports later.

### 2. Clone, install and test locally

```powershell
New-Item -ItemType Directory -Path C:\Sites -Force
Set-Location C:\Sites
git clone https://github.com/darkn3sscontact-stack/smartbraille.git
Set-Location C:\Sites\smartbraille

# Inspect the scripts first. This policy change affects this shell only.
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned

# Use the actual system-wide Python 3.12 path shown by: py -0p
.\scripts\setup.ps1 -Python 'C:\Program Files\Python312\python.exe' -SkipBrowser
.\scripts\start.ps1
```

The Python path is an example: replace it with your installed path. Setup creates `.venv`, installs locked dependencies, downloads pinned models and builds the frontend. It preserves an existing `.env`. Do not copy `.venv` or `node_modules` from another computer. If a download fails, fix the connection and rerun setup. `-SkipBrowser` skips the test browser, not the website.

Open `http://127.0.0.1:8000` **on the server**. In another PowerShell window:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Wait for `model_state: ready` and `voice_available: True`. Stop the foreground server with **Ctrl+C** before installing automatic startup. Do not run two app instances on the same port.

**Voice terms:** the downloaded Natia voice has specific personal-use terms. Organizational/product deployment needs the appropriate permission or a suitably licensed replacement; see [third-party notices](docs/THIRD_PARTY_NOTICES.md). Voice weights are not committed. To install without the voice, add `-SkipVoice`; narration remains unavailable until a permitted voice is configured.

### 3. Public hostname and home network

Use your own domain or a free [DuckDNS](https://www.duckdns.org/) subdomain, such as `YOUR-NAME.duckdns.org`. This is an example, not a registered project address.

**With a domain you own:** open its registrar/DNS dashboard and choose one canonical hostname. For example, to use `braille.yourdomain.com`, add this record:

| Type | Name / Host | Value | TTL |
|---|---|---|---|
| A | `braille` | Your router's public IPv4 address | 300 seconds, or provider default |

For the root domain `yourdomain.com`, use `@` instead of `braille`. An A record contains only the IP: no `https://`, port, or path. Choose one hostname and use exactly that hostname in the configuration commands. `www` is a separate hostname and is not configured automatically. Do not alter unrelated mail/MX records. If using Cloudflare DNS, start with **DNS only** so the direct Caddy setup can be verified first.

**With a free DuckDNS name:** sign in to DuckDNS, register an available name, set its IP to the router's public IPv4 and use the complete `name.duckdns.org` hostname. A free subdomain is sufficient; a paid domain is optional.

1. Point DNS at your home's **public internet IP**, not a `192.168.x.x` address.
2. Reserve a fixed LAN address for the server in your router's DHCP settings.
3. Forward **TCP 80 to server port 80** and **TCP 443 to server port 443**.
4. If the public IP changes, configure your router's DDNS client or the provider's Windows updater. Never commit a DDNS token.
5. Remove an incorrect IPv6/AAAA record if IPv6 cannot reach this server.

In a PowerShell window, confirm that DNS resolves to the expected public IP:

```powershell
$Domain = 'YOUR-NAME.duckdns.org'   # Replace with your chosen real hostname.
Resolve-DnsName $Domain -Type A
```

Example router forwarding (replace `192.168.1.50` with the server's reserved LAN address):

| Protocol | External port | Internal IP | Internal port |
|---|---|---|---|
| TCP | 80 | `192.168.1.50` | 80 |
| TCP | 443 | `192.168.1.50` | 443 |

For CGNAT diagnosis, compare the router's WAN address with the public IP reported by the ISP/router. A private WAN address or one in `100.64.0.0–100.127.255.255` usually means another NAT layer must be handled by your ISP. Do not change firewall settings blindly to compensate for an unreachable WAN address.

Keep backend port 8000 private. Do not expose Remote Desktop for jury access. If IIS or another application occupies 80/443, configure that existing proxy or free those ports before using this Caddy setup.

**CGNAT:** if the ISP does not give the router a reachable public IP, ordinary forwarding will not work. Ask the ISP for a public IP or separately configure a persistent tunnel on the Windows Server. The supplied deployment uses direct forwarding. A raw HTTP LAN address does not enable microphone access on other devices: use HTTPS.

### 4. Configure HTTPS and automatic startup

In PowerShell **as Administrator**:

```powershell
Set-Location C:\Sites\smartbraille
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\scripts\download-caddy.ps1

# Replace with the hostname you actually registered.
$Domain = 'YOUR-NAME.duckdns.org'
.\scripts\configure-windows-server.ps1 -Domain $Domain
.\scripts\install-windows-server.ps1 -OpenFirewall
```

Caddy 2.11.4 is downloaded from its official release and verified with SHA-512. Configuration adds your exact HTTPS origin to `.env`, so microphone/voice requests are accepted, and writes generated settings under `deploy/runtime/`.

| Startup task | Purpose |
|---|---|
| `SmartBraille-App` | One Uvicorn worker bound to `127.0.0.1:8000` |
| `SmartBraille-HTTPS` | Caddy serving the public HTTPS hostname |

Tasks run as the built-in **LOCAL SERVICE** account, start after reboot without a login, and retry failures every minute. That account gets read/execute access to the checkout and write access only to runtime logs/certificates. Install Python and the project outside personal profiles. Do not move the checkout without reconfiguring and reinstalling tasks.

`-OpenFirewall` adds a named `SmartBraille-Web` rule for Caddy on TCP 80/443; it does not configure your router. Caddy automatically obtains/renews trusted certificates once DNS and inbound connectivity work. Keep port 80 available for redirects and certificate challenges.

**What to send the jury:** `https://YOUR-NAME.duckdns.org` (substitute your real hostname), with no `:8000` suffix. They do not need a GitHub account, VPN or connection to your Wi-Fi. Do not distribute this link as ready until the external checks below pass. A GitHub repository URL shows source code, and a `127.0.0.1` URL works only on the computer opening it.

Preview with `install-windows-server.ps1 -WhatIf` after prerequisite files exist. Use `-Replace` only when intentionally replacing these project's existing tasks. A different backend port can be selected during configuration with `-Port 8001`.

### 5. Verify from outside the house

```powershell
Get-ScheduledTask -TaskName 'SmartBraille-*' | Select-Object TaskName,State
Invoke-RestMethod http://127.0.0.1:8000/api/health
.\.venv\Scripts\python.exe scripts/verify-public-url.py https://YOUR-NAME.duckdns.org
```

On a phone, turn off Wi-Fi and open the HTTPS address over mobile data. Test:

- Home, laboratory, alphabet, practice and device pages; reload `/device` directly.
- Word narration and the optional solenoid sound toggle.
- Microphone permission, a real spoken Georgian word and its returned transcription.
- A practice result, CSV/JSON export and device-part interactions.
- A server reboot: both tasks restart and the health endpoint becomes ready again.

The verification script checks pages/assets and model/voice readiness, not real microphone behavior or recognition accuracy. A router without NAT loopback can fail to open the public URL on home Wi-Fi even while mobile data works.

After these checks, set `PUBLIC_URL_VERIFIED=true` in `.env` and restart `SmartBraille-App`. This enables the sharing/QR URL. The printable guide currently describes the local demo address: give the jury the actual URL separately or update the guide.

### 6. Updates and 30-day shutdown

Logs are in `deploy/runtime/logs/app.log` and `caddy.log`, with 10 MiB rotation and five backups. Access logging is off. Keep `.env`, logs and certificate state private. Back up `.env` and `deploy/runtime/caddy-data` privately.

Update in an elevated shell:

```powershell
Stop-ScheduledTask -TaskName SmartBraille-HTTPS
Stop-ScheduledTask -TaskName SmartBraille-App
# Wait until both have left the Running state before continuing.
Get-ScheduledTask -TaskName 'SmartBraille-*' | Select-Object TaskName,State
git rev-parse HEAD   # Record this commit if a rollback is needed.
git pull --ff-only
.\scripts\setup.ps1 -Python 'C:\Program Files\Python312\python.exe' -SkipBrowser
Start-ScheduledTask -TaskName SmartBraille-App
Start-ScheduledTask -TaskName SmartBraille-HTTPS
```

To roll back, stop both tasks, check out the recorded commit, rerun setup/build and restart. Hostname changes require rerunning configuration and external checks; port changes also require reinstalling tasks with `-Replace`.

After 30 days, stop and disable hosting:

```powershell
'SmartBraille-HTTPS','SmartBraille-App' | ForEach-Object {
    Disable-ScheduledTask -TaskName $_
    Stop-ScheduledTask -TaskName $_
}
Remove-NetFirewallRule -Name SmartBraille-Web
```

Remove router forwarding rules too. Hosting does **not** expire automatically. The public GitHub repository remains available until you separately change its visibility or remove it. These shutdown commands do not delete source files or models.

## Troubleshooting

| Symptom | Check |
|---|---|
| Public HTTPS times out | DNS, forwarding, CGNAT, firewall, IIS port conflict |
| Certificate error | Correct hostname, public 80/443, AAAA record, Caddy log |
| Caddy returns 502 | App task, loopback health endpoint, backend port, app log |
| Task exits immediately | System-wide Python, LOCAL SERVICE access, VC++ runtime |
| Model state `error` | RAM/disk and `scripts/download-model.py`; restart after fixing |
| Voice unavailable | Voice download, `PIPER_MODEL`, model permissions; restart |
| POST returns 403 | Exact origin in `ALLOWED_ORIGINS`; restart after edits |
| Microphone blocked | Trusted HTTPS and browser microphone permission |
| 429 | Inference is busy or the per-IP request limit was reached; retry shortly |
| Inaccurate recognition | Retry clearly or correct the text; accuracy is not guaranteed |

## Development and checks

```powershell
.\scripts\build.ps1
.\.venv\Scripts\python.exe -m pytest server/test_app.py -q
npm.cmd --prefix web test

# Keep the app running for browser tests.
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/ms-playwright'
.\web\node_modules\.bin\playwright.cmd install chromium
npm.cmd --prefix web run test:browser

# Cross-browser phone/tablet/desktop layout and interaction checks:
.\web\node_modules\.bin\playwright.cmd install firefox webkit
npm.cmd --prefix web run test:responsive
```

Deployment is native Windows: Docker Desktop and Linux containers are not required. See [deployment validation](docs/WINDOWS_SERVER_VALIDATION.md) for checks performed and what remains to verify on the actual server.

## Repository contents

- `web/`: React/TypeScript/Three.js, assets and browser tests.
- `server/`: FastAPI endpoints, validation tests, pinned Python dependencies.
- `data/`: Braille mapping, reference fixtures, source table and license.
- `scripts/`: setup, build, model downloads, Windows hosting and checks.
- `docs/`: operating guides and third-party notices.
- `output/pdf/`: printable Georgian jury guide.
- `deploy/`: deployment notes; runtime configuration is generated locally.

Git excludes `.env`, model weights, private briefs/annexes, local recordings, dependency folders and deployment credentials. Third-party components retain their licenses; see [notices](docs/THIRD_PARTY_NOTICES.md). Original device image hashes are in `data/asset-manifest.json`.

Reference documentation: [Caddy HTTPS](https://caddyserver.com/docs/automatic-https), [Uvicorn settings](https://www.uvicorn.org/settings/), [Windows Scheduled Tasks](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/) and [DuckDNS](https://www.duckdns.org/about.jsp).
