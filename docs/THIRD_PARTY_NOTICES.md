# Incorporated components

SolidWorks screenshots were supplied by the project team. The three published originals are preserved byte-for-byte (see data/asset-manifest.json). Original project briefs and annexes are not distributed in this repository. Rights to supplied artwork remain with their respective owners.

The Georgian letter subset derives from **Liblouis ka.utb**, copyright 2022 Harris Mowbray, LGPL 2.1 or later. Pinned revision: `07f9f75a94119488fad41d7344b9ac5bba210924`. The unchanged source table and full LGPL 2.1 text are included in `data/`. This application does not embed the Liblouis binary and does not implement the table's numeric/punctuation context rules. Mapping changes must preserve attribution and an accessible source copy.

| Component | License | Use |
|---|---|---|
| React / React DOM | MIT | Interface |
| React Router | MIT | Client routing |
| Three.js | MIT | Schematic scene and OrbitControls |
| Lucide | ISC | Interface icons |
| node-qrcode | MIT | Configured share links |
| Noto Sans Georgian | SIL Open Font License 1.1 | Self-hosted Georgian typography |
| Vite / TypeScript / Vitest / Playwright | MIT / Apache-2.0 / MIT / Apache-2.0 | Build and verification tools |
| FastAPI / Uvicorn | MIT / BSD-3-Clause | Local API and server |
| faster-whisper / CTranslate2 | MIT | Speech recognition runtime |
| Whisper model weights | MIT | Multilingual transcription |
| PyAV | BSD-3-Clause | Audio decoding, bundled FFmpeg libraries |
| NumPy | BSD-3-Clause | Audio arrays |
| eSpeak NG 1.52.0 | GPL-3.0-or-later | Separate local executable for Georgian voice |

Complete frontend dependency license files and available Python distribution notices are collected in `docs/licenses/`; version locks are `web/package-lock.json` and `server/requirements.txt`. eSpeak NG is downloaded separately from the official project by setup; corresponding source is https://github.com/espeak-ng/espeak-ng/tree/1.52.0 . Its license text is included in `docs/licenses/ESPEAK-COPYING.txt`. No eSpeak binary or model weights are committed to source.

The selected model is [LukeJacob2023/whisper-large-v3-turbo-ka-ct2-gguf](https://huggingface.co/LukeJacob2023/whisper-large-v3-turbo-ka-ct2-gguf), revision `a99c5dfd889a2ffca19908d99e8b4ffec7de433a`, declared MIT by its author. The supplied model card is preserved in `docs/licenses/GEORGIAN-WHISPER-MODEL-CARD.md`; it describes base weights, training datasets and limitations. No training dataset is redistributed. Other model aliases download from the repositories configured by faster-whisper. Model snapshots and observed configurations are documented in the test report. Raw model output is retained without answer-aware rewriting.

The prerecorded human fixture `tests/audio/Sakartvelo.ogg` is by Wikimedia Commons contributor Kober (2009), released to the public domain. Its original metadata and attribution are preserved beside the file. This is a test fixture, not a live user recording.



## Neural voice update

Piper TTS 1.8.0 (GPL-3.0-or-later) now provides local neural synthesis. Full package notices are in `docs/licenses/piper-tts/`. The browser no longer selects an installed operating-system speech voice. eSpeak's phonemizer library inside Piper is distinct from the old standalone eSpeak audio synthesizer.

The downloaded Georgian Natia model comes from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices/tree/c10ece1aade47bb51c153c893d14e5bf8e5b7117/ka/ka_GE/natia/medium), pinned revision `c10ece1aade47bb51c153c893d14e5bf8e5b7117`. Model card: `docs/licenses/PIPER-NATIA-MODEL-CARD.md`. Although the repository has an MIT label, this card points to RHVoice dataset-specific terms: do not interpret the repository label as unrestricted Natia rights. The original voice copyright is Beqa Gozalishvili, Olga Yakovleva and Vladimer Urdulashvili. [RHVoice's Natia terms](https://github.com/RHVoice/RHVoice/blob/master/doc/en/License.md#natia) permit individual personal use and specify separate permission for organizations/manufacturers. The terms are preserved in `docs/licenses/RHVOICE-VOICE-TERMS.md`.

The model is installed for this individual's local evaluation; it is not committed or publicly hosted. Any organizational/product deployment must resolve the voice-specific rights or choose another licensed voice. Setup downloads model artifacts from their original repository; no source recording or new voice cloning is performed.
