"""Extract only the supported 33-letter subset from the pinned, unchanged table."""
from pathlib import Path
import re, json, hashlib
root = Path(__file__).resolve().parents[1]
source = root / 'data/ka.utb'
letters = {}
for code, dots in re.findall(r'^letter\s+\\x([0-9a-f]+)\s+([1-6]+)', source.read_text(encoding='utf-8'), re.M):
    letters[chr(int(code, 16))] = sum(1 << (int(d)-1) for d in dots)
assert len(letters) == 33
mapping = {'revision': (root/'data/liblouis-revision.txt').read_text().strip(), 'source': 'Liblouis ka.utb', 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'letters': letters}
(root/'data/mapping.json').write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding='utf-8')
