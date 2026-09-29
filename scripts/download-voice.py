"""Download the pinned Georgian neural voice; runtime synthesis stays local."""
from pathlib import Path
from huggingface_hub import snapshot_download
root = Path(__file__).resolve().parents[1]
print(snapshot_download('rhasspy/piper-voices',
    revision='c10ece1aade47bb51c153c893d14e5bf8e5b7117',
    local_dir=str(root/'models/piper'),
    allow_patterns=['ka/ka_GE/natia/medium/ka_GE-natia-medium.onnx',
        'ka/ka_GE/natia/medium/ka_GE-natia-medium.onnx.json',
        'ka/ka_GE/natia/medium/MODEL_CARD']))
