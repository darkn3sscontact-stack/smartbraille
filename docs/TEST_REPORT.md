# Build and verification report

Executed 29 September 2026 on the supplied Windows workstation. This report concerns the newly implemented software; it does not assert earlier student tests, physical-device performance or learning improvement.

## Delivered environment

- Application 1.0.0, React 19.2.0, TypeScript 5.9.3, Vite 7.3.6, Three.js 0.180.0, React Router 7.18.4.
- Node 24.19.0 / npm 11.17.0; Python 3.12.14; FastAPI 0.119.0; faster-whisper 1.2.0 / CTranslate2 4.8.2. Exact dependencies are locked in package-lock.json and server/requirements.txt.
- One local production origin: http://127.0.0.1:8000 . Eleven SPA routes and API served by Uvicorn; no public deployment.
- Selected recognizer: Georgian fine-tune `LukeJacob2023/whisper-large-v3-turbo-ka-ct2-gguf`, revision `a99c5dfd889a2ffca19908d99e8b4ffec7de433a`; local directory `models/georgian-turbo`; CPU / int8 / 4 threads, fixed `ka`, `transcribe`, no prompt/hotwords/expected answer. Model SHA-256: `6b15eb44f68c3de7d5387efb390bd7ec81e3eac381033db7d9909bbb6c973544`.
- eSpeak NG 1.52.0, actual Georgian voice found. The model and voice load locally; initial setup needs internet.
- Braille table pinned at Liblouis revision `07f9f75a94119488fad41d7344b9ac5bba210924`; modern 33 letters and spaces only.

## Completed automated verification

**82 tests passed:** 51 Vitest reference/data tests, 17 pytest API tests, 14 Playwright browser tests. Final browser suite: 14 passed in 16.4 seconds against the built production server and selected model. Raw browser report: `browser-test-results.json`.

| Check | Observed result |
|---|---|
| All 33 letters, independent masks/Unicode, three word fixtures | Pass; expected values are separate fixtures |
| Previously unprepared word / normalization / unsupported input | Pass; unsupported characters remain explicit |
| Exact original source files | Pass; published image hashes match data/asset-manifest.json |
| Confirmed correct vs incorrect, retry, first attempt | Pass; incorrect original is retained; retry is assisted |
| Raw voice result vs correction | Pass; separate raw/edited fields and recognition history; deterministic browser test uses labelled mocked ASR |
| Silence and cancellation | Pass; no fabricated answer or wrong learner grade; stale response ignored |
| Expected answer isolation | Pass; recognizer receives audio and fixed decoding options only |
| Real browser capture to real API | Pass; Chromium fake microphone, actual MediaRecorder multipart bytes, real decoder/model service response; request observed and continued, response not mocked |
| Limits and errors | Pass; size/duration/MIME/origin/rate/busy validation, silent audio, unavailable service, typed fallback |
| Word playback | Pass; advances, pauses and resets |
| Session metrics / JSON export / CSV encoding | Pass; actual attempts agree with visible metrics, raw/corrected fields remain distinct |
| Visitor reset | Pass; current visitor starts empty, prior evidence preserved behind explicit old-session control |
| 2D and 3D | Pass; real WebGL canvas differs for all-down/all-up; canonical 2D masks agree |
| No WebGL | Pass; original image and working 2D cell remain |
| Keyboard | Pass for pattern construction/submission, hotspot operation, lightbox Escape and focus return |
| Gallery alignment | Pass at desktop and 390px width |
| Mobile | Pass; seven main routes without horizontal overflow at 390×844; visual review in native browser |
| Production deep links/assets/PDFs | Pass for all eleven routes and supplied assets, including direct nested-route navigation |

The first mobile test found overflow in the laboratory; grid sizing was corrected and the suite then passed. The added transport test initially attempted a Playwright binary-body API that returned null/zero; request interception with `continue()` now observes actual upload bytes while preserving the genuine server response.

Production TypeScript/Vite build passed. The dependency audit reported **zero known npm vulnerabilities** at the check time after updating Vite, Vitest and React Router. This is not a security certification. Pytest printed a non-failing upstream AnyIO deprecation and a cache-directory permission warning; all assertions passed.

## Actual audio observations

`scripts/audio-smoke.py` calls the real TTS and ASR endpoints. References are kept in the report, never sent to recognition. Final raw results in `final-audio-smoke-results.json`:

| Input | Raw output | Observed CPU time | Interpretation |
|---|---|---|---|
| Prerecorded human საქართველო | საქართველო | 4,755 ms | Exact match on this single public-domain fixture |
| Synthetic დედა და მამა | დედა და მამა. | 5,080 ms | Correct after documented terminal-punctuation normalization |
| Synthetic გამარჯობა | გამარწობა? | 5,868 ms | Recognition error retained; not counted as success |
| One second digital silence | Empty, `no-speech` | 4 ms | Correctly unresolved |

Two synthesized responses were real WAV files, 63,732 and 71,348 bytes. Voice inventory, UTF-8 phoneme output and WAV generation were verified. Physical speaker listening/clarity is still pending.

Earlier `tiny`, `small` and unadapted turbo comparisons failed these short Georgian samples (romanization or repeated letters). Preserved diagnostics include `audio-smoke-results.json`, `small-model-comparison.json`, `turbo-model-comparison.json`, `corrected-audio-model-comparison.json`, `human-audio-model-comparison.json`, and `decoder-diagnostic.json`. Early synthetic comparisons used the initial broken UTF-8 path; they are not final-quality evidence. `georgian-model-comparison.json` records the selected model's direct comparison. No reported sample establishes population accuracy or learning benefit.

### Windows eSpeak issue reported by the user

Early standalone portable-executable probes without an explicit data path caused an `espeak-ng.exe` access-violation dialog, also shown in the user's screenshot. The app now supplies its absolute data directory, requests UTF-8 (`-b 1`), newline-terminates stdin, uses no-window subprocess flags and suppresses native fault dialogs only within the server/child processes. Executable failure returns a service error. Corrected API synthesis succeeded repeatedly; no eSpeak/fault-report process remained after those probes. This fixes the exercised integration path, not every possible native-library failure.

## Setup, renders and visual evidence

- Initial dependencies, portable eSpeak and model downloads completed; model pre-download reran successfully against the pinned revision.
- `setup.ps1 -SkipModel -SkipBrowser` completed repeat dependency/voice/mapping/build setup. Model and browser installation steps were also run individually. A fresh unrelated computer has not been tested.
- `start.ps1` was used to start the final service; `health.ps1` returned model ready, CPU/int8, language ka and voice available.
- `export-renders.ps1` successfully generated three real 1600×1600 PNGs from the actual Three.js scene: overview, cutaway and surface close-up. Files decode and were visually inspected. They are schematic, not original CAD exports.
- Native in-app browser visual review covered desktop home, laboratory, device and mobile layout. Genuine screenshots are in `docs/screenshots/`. Original PDFs were extracted and both pages of each were visually reviewed; all three original JPEGs were reviewed and preserved.

## Manual / external checks still pending

1. **Live Georgian microphone trial:** open `/checks`, listen to its voice test, then `/lab`; allow the physical mic, record three new words from different speakers, stop and compare raw transcript. Test a quiet room, normal background noise and an intentional silence. Record recognition failures separately from learner answers.
2. **Human voice/assessment trial:** run a one-question read test and a build test using typed and spoken input; verify confirmation, correction, feedback, pause, retry and export. Check pronunciation/intelligibility, individual letter names and dictated dot numbers with Georgian speakers.
3. **Assistive technology:** test NVDA or the intended screen reader, browser zoom, all-page keyboard traversal and practical usability. Automated keyboard checks do not certify accessibility. Dot-number audio does not measure tactile Braille reading.
4. **Public HTTPS / QR / second device:** not deployed or tested. Sharing controls intentionally show setup guidance until an actual HTTPS base is configured and verified. Another device cannot use this host's localhost.
5. **Physical device:** no connected hardware. Pin travel/forces, actuator choice, electrical/thermal safety, reliability, manufacturing and tactile readability require physical evaluation. All browser motion is labelled simulation.

No sensitive participant data or learner records were preseeded. Automated browser records live in isolated test profiles. The speech API does not retain submitted audio; explicitly generated test fixtures are labelled in this repository.

## Follow-up: score-free judges guide and solenoid sound

At the user's request, point badges and point totals were removed from the judges page. Criteria/evidence links and the original source PDF remain. Added an opt-in Web Audio mechanical impulse to the laboratory, alphabet and device simulation. It plays only for newly raised pins, with a preview on enable; unchanged/falling pins are silent. Global mute and microphone recording suppress it; unmount closes the AudioContext. No audio file, Windows voice or speech endpoint is involved.

Production build passed. Added browser checks verify the judges page contains no point text, real generated audio has finite bounded nonzero samples and a short duration, sound triggers on rising rather than falling, global mute suppresses it, no speech request is made, and leaving the page closes audio resources. The mobile layout test also passed. Acoustic resemblance to a particular physical solenoid is illustrative and not measured.

Follow-up regression run: **16 / 16 browser tests passed** in 18.8 seconds, including both new tests; current raw report is `browser-test-results.json`. Combined with the unchanged 51 reference and 17 API checks from the initial build, the suite now contains 84 tests.


## Follow-up: shared simulation sound and neural Georgian speech

The solenoid setting is now shared at application level and displayed in the top bar. It stays enabled across client-side navigation and affects active home conversion cells, word playback, alphabet selection, quiz pattern presentation/building and device simulation. Static history/decorative cells stay silent. Simultaneous cell transitions are combined into one bounded impulse; synchronized 2D/3D views do not double-play. The metallic high-frequency component and output gain were softened. Global mute and recording stop pending/active impulses. Turning the setting off or unmounting the application closes its audio resources. Reload starts muted until a user enables it.

The speech path now uses **Piper TTS 1.8.0 / Natia / ka-GE**, a local neural voice. The frontend does not enumerate/select or invoke Windows/browser speech-synthesis voices. eSpeak remains an explicit operator fallback only, never an automatic fallback. Piper's model and configuration are pinned at rhasspy/piper-voices revision `c10ece1aade47bb51c153c893d14e5bf8e5b7117`. Model SHA-256: `04bdacf188fa24499885f9109b395fe8561a05ec2cd90d55453ec5beed7af460`. Voice-specific rights are recorded in THIRD_PARTY_NOTICES.md; this is individual local evaluation, not an organizational/public release.

Actual `/api/speak` calls returned valid mono 22,050 Hz WAV audio. Sample evidence: `neural-voice-smoke.json`; audible example: `natia-voice-preview.wav`. The 3.97-second example took 234 ms to synthesize in this run. The same short phrase at rate 110 lasted 1.23 seconds, and at rate 190 lasted 0.80 seconds. These are observed local timings, not performance guarantees. A successful WAV response does not prove pronunciation or subjective naturalness; the user can audition the saved sample.

Production build passed; **19 API tests passed**, including neural WAV/rate handling and lock release/error privacy on inference failure. New browser coverage checks setting continuity across navigation, word playback, pattern building, recording suppression, and real neural-service WAV blobs without invoking system TTS. The native preview was used to enable the setting, navigate to the word laboratory, enter დედა და მამა, play neural speech, and run word playback. Earlier eSpeak reports above are historical and do not describe the current default engine.

Final audio-update regression: **18 / 18 browser tests passed** in 23.8 seconds; **19 / 19 API tests passed**. The unchanged 51 reference tests from the prior build bring current coverage to 88 tests. Python dependency consistency check passed for all 42 installed packages. Current full browser report: browser-test-results.json.


## Playback audibility correction

The user reported no audible sound from Play. Inspection confirmed Play previously advanced visual cells only; neural narration was available solely via the separate speaker button. The lab now narrates the current letter immediately on Play and on each playback step, including repeated letters, with a checked-by-default narration checkbox. Pause/reset/unmount stop pending speech. Global mute remains respected and a local unmute control is shown when muted. Play resumes a suspended solenoid AudioContext; click gain increased from 0.18 to 0.40 while preserving a bounded short waveform.

Production build passed. Three focused browser checks passed: playback progression/pause/reset; mobile layout; and real letter-speech requests plus HTMLMediaElement `playing` events from pressing Play, resumption of an explicitly suspended AudioContext, pause stopping further requests, and narration opt-out. The current `browser-test-results.json` is this targeted 3-test run, not a new full-suite run. The current in-app browser was refreshed and Play tried with დედა. Browser audio execution is verified; physical speaker audibility remains for the user to confirm.

## Interactive device anatomy

The device page now opens with an interactive Three.js anatomy exhibit. Clicking actual model geometry or the keyboard-accessible unfold control separates six functional groups. Numbered anchors follow the model as it rotates; the part list provides an equivalent keyboard path. Each group has Georgian function text, a three-stage demonstration and an explicit explanation of schematic assumptions. Pins can be selected individually. Normal motion uses a play/pause cycle; reduced-motion uses manual steps. Selecting another part, reassembly, reset, hiding the tab or unmount stops the demonstration. Enabled shared Web Audio clicks accompany illustrative raising. Original renders remain under their own tab. PNG export temporarily assembles the model and restores exploration state.

Production build and all **22 browser tests passed** (54.1 seconds), including existing audio/word-playback checks and three new anatomy tests: six group descriptions and actual canvas changes per demonstration; pointer picking versus drag, timed animation and reset; mobile marker bounds, no overflow, PNG download and restored state. Native browser visual review completed. This remains a schematic based on supplied images, with no exact CAD geometry or measured actuator mechanics.

Final anatomy refinement: increased the exploded viewing angle so the six top holes remain visible, softened stage reflections and regenerated all three schematic PNGs from the UI. Production build passed; the three anatomy browser checks passed again (28.5 seconds). The full 22-test JSON report is retained. Reviewed screenshots: screenshots/device-anatomy-desktop.jpg and screenshots/device-anatomy-mobile.jpg.

## Shared glass interface refresh

All routes use a shared translucent material theme with a pastel background, floating navigation, rounded controls, frosted content panels, clear focus states and dark glass for the device explorer. The header includes a persistent glass/opaque switch, independent of Windows transparency settings. High-contrast and reduced-motion preferences remain supported. Route focus now preserves scroll so the sticky header does not cover page headings.

The requested development note and all appendix references/download links were removed from the served site. Both appendix PDFs were removed from public assets; their previous URLs return HTTP 404. Original source material outside the served website remains intact. Component license notices and the Braille mapping attribution remain available.

Build passed. The updated full browser suite passed **22/22** checks (43.4 seconds); a subsequent two-test mobile/exploration check passed after adding the appearance control. Native preview verified glass rendering (`blur(22px) saturate(1.55)`), opaque-mode persistence after reload, mobile menu, unobscured headings, and the cleaned project/engineering/judges pages. Screenshots: glass-home-desktop.jpg, glass-lab-desktop.jpg, glass-device-mobile.jpg under screenshots/.

Visual reference: Apple's material guidance, https://developer.apple.com/design/human-interface-guidelines/materials. This is a CSS implementation inspired by that visual language, not a native iOS framework.
