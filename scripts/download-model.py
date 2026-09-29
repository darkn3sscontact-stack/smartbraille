from pathlib import Path
import os
from dotenv import load_dotenv
from faster_whisper.utils import download_model
from huggingface_hub import snapshot_download
root = Path(__file__).resolve().parents[1]
load_dotenv(root/'.env')
name = os.getenv('WHISPER_MODEL','models/georgian-turbo')
if name.endswith('.en') or name.startswith('distil-'):
    raise SystemExit('A multilingual model is required for Georgian.')
if name.replace('\\','/') == 'models/georgian-turbo':
    print(snapshot_download('LukeJacob2023/whisper-large-v3-turbo-ka-ct2-gguf',
        revision='a99c5dfd889a2ffca19908d99e8b4ffec7de433a',
        local_dir=str(root/'models/georgian-turbo'),
        allow_patterns=['README.md','config.json','model.bin','preprocessor_config.json','tokenizer.json','vocabulary.json']))
elif (root/name/'model.bin').is_file():
    print((root/name).resolve())
else:
    print(download_model(name, cache_dir=str(root/os.getenv('MODEL_DOWNLOAD_ROOT','models'))))
