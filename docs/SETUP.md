# Setup and operation (Windows PowerShell)

This is a local React/TypeScript/Vite + Three.js frontend and Python/FastAPI speech service. One production origin serves both at http://127.0.0.1:8000 . No account, database, hardware connection, cloud speech key, or runtime internet is required after installation/model download.

## Prerequisites and installation

Use Node.js 22.12+ (tested: 24.19.0), npm (tested: 11.17.0), Python 3.12 (tested: 3.12.14), and Windows PowerShell/PowerShell. `uv` is supported but not required. Initial dependency and model downloads need internet.

```powershell
cd C:\Sites\smartbraille
.\scripts\setup.ps1 -Python "C:\path\to\python.exe"
.\scripts\start.ps1
```

If Python is on PATH, omit `-Python`. An existing `.venv` is reused. Setup never replaces an existing `.env`. For a fresh clone, complete setup first. Stop any existing demo server before starting another on the same port.

Open http://127.0.0.1:8000 . Keep the terminal open. Stop with Ctrl+C. In a second terminal:

```powershell
.\scripts\health.ps1
```

Scripts are plain local source and require a PowerShell policy that allows running scripts. Do not disable system security controls; use your normal permitted development shell.

## Speech configuration

Copy `.env.example` to `.env` if absent. The default is `models/georgian-turbo`: a Georgian fine-tune of multilingual Whisper large-v3-turbo, using CPU `int8` and four threads. The download script pins LukeJacob2023/whisper-large-v3-turbo-ka-ct2-gguf at `a99c5dfd889a2ffca19908d99e8b4ffec7de433a` (MIT, about 1.62 GB download). It correctly transcribed the recorded human fixture საქართველო; synthetic samples had mixed results. See `georgian-model-comparison.json`. One word is not a representative accuracy benchmark: validate with intended speakers before presenting voice recognition as reliable.

`tiny`, `small` and unadapted `large-v3-turbo` produced poor Georgian outputs in the recorded comparisons. `tiny` remains useful only for a quick installation/transport check. The selected model loads from local files at runtime; several GB of available RAM are needed.

To change models, edit `WHISPER_MODEL` and pre-download before starting:

```powershell
.\.venv\Scripts\python.exe .\scripts\download-model.py
.\scripts\start.ps1
```

Supported examples: `tiny`, `base`, `small`, `medium`, `large-v3`, `large-v3-turbo`, or a compatible local converted-model directory. Do not use `.en` or English-only distillation models. Transcription always requests `language='ka'`, `task='transcribe'`; no expected answers or prompts are passed. Runtime defaults to `MODEL_LOCAL_ONLY=true`.

Optional GPU: set `WHISPER_DEVICE=cuda` and an appropriate `WHISPER_COMPUTE_TYPE`, e.g. `float16`, after installing matching CTranslate2/CUDA dependencies. GPU setup was not tested; CPU is the tested installation path. Consult the pinned faster-whisper documentation and CTranslate2 requirements before configuring GPU libraries.

### Voice

The default voice is now **Piper / Natia / ka-GE**, a neural Georgian model running locally on the CPU. Install with `scripts/download-voice.py` (also called by `setup.ps1`). The pinned model is about 64 MB. `TTS_ENGINE=piper` and `PIPER_MODEL` select it; the health endpoint reports the actual engine. The browser plays returned WAV audio and does not use Windows/SAPI voices. Text remains on this computer. The model's voice-specific license terms are documented in THIRD_PARTY_NOTICES.md; the installed voice is for individual local evaluation.

Speech rate changes model duration (`length_scale=150/rate`). Missing neural weights report voice unavailable rather than silently falling back to a robotic voice. The old standalone eSpeak implementation is retained only as an explicit operator option (`TTS_ENGINE=espeak` and `scripts/setup-voice.ps1`). Its data path, UTF-8 and fault-dialog safeguards remain.

The synthesized solenoid click is separate: JavaScript/Web Audio creates it in the browser. Enable it once in the top bar; the choice follows navigation across home conversion, word playback, alphabet, practice and device simulation. It stops while recording or globally muted. Static evidence/history cells stay silent. The preference lasts for this loaded app session; a reload requires enabling sound again to comply with browser playback rules.

### Audio decoder

The installed PyAV wheel bundles FFmpeg libraries. A separately installed `ffmpeg.exe` is not needed by the speech API. Playwright installs its own test-only FFmpeg helper. Recordings are limited to 30 seconds and 6 MB by default; allowed MIME types are WebM, Ogg, WAV, MP4 and MPEG audio. Decoded duration is checked independently of upload metadata. No raw recording is saved by the API.

One transcription runs at a time. Concurrent requests receive 429. Cancellation aborts the browser request and ignores stale responses; already-running model inference may finish in the worker, which keeps the lock until it finishes. The recording cap bounds input; this is not a public multi-user inference service.

## Development, verification and render export

```powershell
# First terminal: production API, or API while Vite proxies /api
.\scripts\start.ps1

# Second terminal: optional development frontend
cd web
npm.cmd run dev

# From repository root, rebuild then run tests against the running server
.\scripts\build.ps1
.\scripts\test.ps1
.\.venv\Scripts\python.exe scripts/audio-smoke.py
.\scripts\export-renders.ps1
.\scripts\build.ps1
```

`npm test` runs independent reference and record-integrity fixtures. `server/test_app.py` uses a stub recognizer only for isolated request validation tests. Browser tests use isolated profiles and explicitly labelled fake media/ASR responses where deterministic outcomes are required. `audio-smoke.py` sends real synthetic WAV bytes to the actual model and keeps raw outputs. None replaces a human microphone/voice-quality check.

Rendered PNGs are generated by the app's own Three.js scene at 1600×1600. The export script clicks actual viewer controls and saves downloads into `web/public/assets/device/generated/`; rebuilding copies them to production. The originals remain untouched and are independently hash-checked.

## Sharing / deployment

The repository [README](../README.md) contains the complete native Windows Server
handoff: prerequisites, model installation, public hostname, router forwarding,
Caddy HTTPS, LOCAL SERVICE startup tasks, verification and shutdown.

Microphones on another device require trusted HTTPS. Keep Uvicorn on loopback and
use the exact public origin in `ALLOWED_ORIGINS`. The configuration script does
this without replacing unrelated `.env` settings. Use one worker to avoid loading
multiple copies of the recognition model. Public access must be verified on the
target network before setting `PUBLIC_URL_VERIFIED=true`.

## Troubleshooting

- Model not ready: check `/api/health`, `.env`, available disk/RAM and the pre-download command. `model_error` reports the exception class without filesystem secrets. Restart after changing configuration.
- Voice unavailable: run `.venv/Scripts/python.exe scripts/download-voice.py`, verify `PIPER_MODEL`, then restart. Check the actual engine in `/api/health`.
- Permission denied/mic missing: use an HTTPS/localhost context and site microphone permission, release the mic in other apps, or use the complete typed path.
- Recognition wrong: keep the raw result, retry or explicitly correct. Do not count correction as recognition success. Larger model choice needs actual speaker recordings.
- 3D unavailable: the original images and canonical 2D cell remain usable. `?noWebGL=1` is a documented fallback-test switch.
- Storage unavailable: allow site local storage. Export records before deliberately clearing them. New visitor creates a new session without erasing prior attempts.
- Port busy: stop the prior demo server or use `scripts/start.ps1 -Port 8001`; add the matching local origin to `ALLOWED_ORIGINS` for voice POST requests on another port.
