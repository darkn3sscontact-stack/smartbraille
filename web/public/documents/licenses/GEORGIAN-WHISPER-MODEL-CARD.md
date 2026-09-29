---
license: mit
base_model: openai/whisper-large-v3-turbo
language:
  - ka
pipeline_tag: automatic-speech-recognition
tags:
  - automatic-speech-recognition
  - whisper
  - whisper-large-v3-turbo
  - georgian
  - ka
  - ctranslate2
  - gguf
---

# Georgian Whisper Large V3 Turbo

This repository contains Georgian automatic speech recognition models fine-tuned
from [`openai/whisper-large-v3-turbo`](https://huggingface.co/openai/whisper-large-v3-turbo).

The model is intended for speech recognition of Georgian speech written in the
Georgian script.

This repository contains converted inference artifacts in the following formats:

- CTranslate2, for use with `faster-whisper`
- GGUF, for use with compatible Whisper/GGUF inference tools

The original Transformers checkpoint is not included in this repository.

## Language and task

- Language: Georgian (`ka`)
- Task: speech transcription
- Recommended task: `transcribe`
- Recommended language setting: `ka`

For best results, explicitly specify the language during inference instead of
using automatic language detection.

## Training data

The model was fine-tuned using the following Georgian speech datasets:

- Mozilla Common Voice Georgian Scripted Speech, validated samples
- Google FLEURS Georgian (`ka_ge`)
- Mozilla Common Voice Georgian Spontaneous Speech, validated
  transcriptions without quality warnings

The source datasets were used only for model training. The source audio files
and source dataset archives are not included in this repository.

> **If you find this project useful, you are welcome to contribute additional
> open-source or private datasets to help improve the model's accuracy.**

## Limitations

Performance may be lower for:

- noisy recordings
- heavily reverberated recordings
- clipped or very quiet audio
- telephone-quality audio
- strong accents or dialects
- code-switching
- technical vocabulary
- speech longer than 30 seconds
- audio whose acoustic conditions differ substantially from the training data

The model is optimized for Georgian transcription. It should not be expected to
perform equally well on other languages.

The model may produce incorrect text when the input contains silence, music,
background noise, overlapping speakers, or unintelligible speech.

Users should evaluate the model on audio representative of their intended
application before deploying it in production.

## Speaker privacy

The model and its training data must not be used to identify speakers or infer
the identity of people from their voices.

## License

The converted model artifacts in this repository are released under the
[MIT License](https://opensource.org/licenses/MIT).

The base model is:

- [`openai/whisper-large-v3-turbo`](https://huggingface.co/openai/whisper-large-v3-turbo)
- License: MIT

The training datasets have separate terms:

- Mozilla Common Voice: CC0, subject to Mozilla Data Collective terms
- Google FLEURS: CC-BY-4.0
- Mozilla Common Voice Spontaneous Speech: CC0

FLEURS attribution:

> Conneau et al., “FLEURS: Few-shot Learning Evaluation of Universal
> Representations of Speech,” 2022.

The training audio and source dataset archives are not redistributed in this
repository. Users must obtain and use each source dataset according to its own
terms.

Common Voice users must also follow the current Mozilla Data Collective terms,
including restrictions concerning redistribution and speaker identification.

## Disclaimer

This model is provided for research and development purposes. The authors do
not guarantee that the generated transcriptions are accurate, complete, or
suitable for any particular use case.
