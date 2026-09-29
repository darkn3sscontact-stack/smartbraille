"""Real API checks: two synthetic samples, one attributed human fixture, silence.
Not a live microphone trial or a representative ASR benchmark.
"""
from pathlib import Path
import io,json,wave
from datetime import datetime,timezone
import httpx
root=Path(__file__).resolve().parents[1]
results=[]
with httpx.Client(base_url='http://127.0.0.1:8000',timeout=180) as client:
    health=client.get('/api/health').json()
    assert health['model_state']=='ready'
    for i,phrase in enumerate(['გამარჯობა','დედა და მამა']):
        response=client.post('/api/speak',json={'text':phrase,'rate':130})
        response.raise_for_status()
        assert response.content[:4]==b'RIFF'
        (root/'tmp').mkdir(exist_ok=True)
        (root/'tmp'/f'api-synthetic-{i}.wav').write_bytes(response.content)
        # Only actual WAV bytes enter ASR; reference is retained only for this report.
        transcript=client.post('/api/transcribe',files={'audio':('synthetic.wav',response.content,'audio/wav')})
        transcript.raise_for_status()
        results.append({'source':'synthetic eSpeak NG Georgian WAV, not a live participant','reference':phrase,'audio_bytes':len(response.content),'response':transcript.json()})
    human=(root/'tests/audio/Sakartvelo.ogg').read_bytes()
    response=client.post('/api/transcribe',files={'audio':('human.ogg',human,'audio/ogg')})
    response.raise_for_status()
    results.append({'source':'prerecorded human: Kober / Wikimedia Commons, public domain; not a live participant','reference':'საქართველო','audio_bytes':len(human),'response':response.json()})
    silence=io.BytesIO()
    with wave.open(silence,'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(16000);f.writeframes(b'\0'*32000)
    response=client.post('/api/transcribe',files={'audio':('silence.wav',silence.getvalue(),'audio/wav')})
    response.raise_for_status()
    assert response.json()['state']=='no-speech' and response.json()['raw_transcript']==''
    results.append({'source':'generated digital silence','response':response.json()})
report={'timestamp':datetime.now(timezone.utc).isoformat(),'health':health,'results':results}
(root/'docs/final-audio-smoke-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
