# Windows Server deployment validation

Checked on 29 September 2026 on the Windows development workstation. The remote
home server was not accessed, and no public hostname has been deployed by these checks.

## Passed

- Production TypeScript/Vite build.
- 49 frontend unit/reference tests, including hashes of the three published CAD renders.
- 19 Python API validation tests.
- 22 browser regression tests against the built local site (41.6 seconds).
- PowerShell parsing for all setup/deployment scripts.
- Configuration generation under Windows PowerShell 5.1 in a separate fixture
  directory: public hostname/port, origin allowlist, unverified sharing URL,
  Caddy configuration and rotating log configuration.
- Reconfiguration preserved model settings and did not duplicate environment keys.
- Invalid URL input was rejected; `-WhatIf` did not modify configuration.
- Caddy 2.11.4 official Windows archive verified with the published SHA-512 checksum.
- Caddy accepted the generated public-host configuration with `caddy validate`.
- A separate Uvicorn process using the production logging/proxy settings loaded
  the real Whisper and Piper models. A temporary loopback HTTP Caddy proxy served
  deep links/assets, generated a Georgian WAV, rejected an untrusted Origin, and
  forwarded a silence upload through the real transcription endpoint.
- Public sharing stayed unavailable while `PUBLIC_URL_VERIFIED=false`.
- Source publication scan found no matching credential patterns or private local
  user paths in the files selected for publication. Models, `.env`, private
  references, local audio previews and generated server state were excluded.

The local proxy test deliberately used HTTP on loopback, without requesting a
public certificate. Temporary processes were stopped after testing. The existing
local demonstration server was not replaced.

## Still required on the target server

- Fresh dependency/model installation using system-wide Python 3.12 x64.
- LOCAL SERVICE permissions, task registration, startup after logout/reboot,
  and Task Scheduler failure recovery on the chosen Windows Server version.
- Reachable public DNS, router forwarding, firewall and ISP/CGNAT checks.
- A real publicly trusted HTTPS certificate and renewal connectivity.
- External phone microphone, voice quality, recognition accuracy and small-group load.
- Voice-model permission appropriate to the intended deployment.

The README gives the operator the commands and acceptance checks for these steps.
Passing workstation tests is not a claim that the separate home server is already live.

## Responsive and browser compatibility update

The production build was also checked with the new `npm run test:responsive`
suite. Its 32 tests cover four workflows in each of eight profiles:

| Profile | Browser engine / viewport |
|---|---|
| Compact phone | Chromium, 320 x 568, touch/mobile |
| Android | Chromium, Playwright Pixel 7 profile |
| iPhone portrait | WebKit, Playwright iPhone 13 profile |
| iPhone landscape | WebKit, Playwright iPhone 13 landscape profile |
| iPad | WebKit, Playwright iPad Mini profile |
| Desktop Chrome | Chromium, 1440 x 900 |
| Desktop Firefox | Firefox, 1366 x 768 |
| Desktop Safari engine | WebKit, 1280 x 800 |

Checks passed for all 11 routes without page-level horizontal overflow, mobile
navigation including Escape/focus and a 568 x 320 short viewport, long Georgian
input, 16px mobile form text, 44px primary touch controls, and device exploration
or its explicit WebGL fallback. Image-dialog controls remained usable within
the viewport. Health requests and input also worked when `AbortSignal.any` and
`AbortSignal.timeout` were unavailable.

There are now 53 passing frontend unit tests, including four for portable request
deadlines and cancellation. The 19 API tests also passed after these changes.
The existing 22 browser regressions passed again in 40.9 seconds, including real
speech playback and 3D interaction. Together with the 32 compatibility checks,
the final run contains 126 passing tests.
Desktop and narrow-screen layouts were visually inspected in the in-app browser.

These browser-engine tests ran on Windows. They do not establish that physical
iOS/Android devices, macOS/Linux installations, microphone hardware or the home's
public network have been tested. The README's external-device checklist remains
required before distributing the live domain.
