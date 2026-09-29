"""Request validation tests. Recognizer is stubbed ONLY in isolated API tests."""
import io
import wave
from types import SimpleNamespace
import numpy as np
import pytest
from fastapi.testclient import TestClient
from server import app as service

def wav(seconds=1, amplitude=0):
    buffer=io.BytesIO()
    with wave.open(buffer,'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(16000)
        values=(np.sin(np.arange(int(seconds*16000))*.1)*amplitude).astype('<i2')
        f.writeframes(values.tobytes())
    return buffer.getvalue()

@pytest.fixture
def client(monkeypatch):
    service.requests_by_ip.clear()
    monkeypatch.setattr(service,'model_state','ready')
    monkeypatch.setattr(service,'model',SimpleNamespace(transcribe=lambda *a,**kw:([SimpleNamespace(text='დედა')],None)))
    return TestClient(service.app)

def test_health_is_actual(client):
    body=client.get('/api/health').json()
    assert body['model_state']=='ready' and body['language']=='ka'

def test_silence_is_not_an_answer(client):
    response=client.post('/api/transcribe',files={'audio':('silence.wav',wav(),'audio/wav')})
    assert response.status_code==200
    assert response.json()['state']=='no-speech'
    assert response.json()['raw_transcript']==''

def test_transcription_has_no_answer_prompt(client,monkeypatch):
    observed={}
    def transcribe(audio,**kw):
        observed.update(kw)
        assert len(audio)>0
        return [SimpleNamespace(text='სხვა სიტყვა')],None
    monkeypatch.setattr(service,'model',SimpleNamespace(transcribe=transcribe))
    response=client.post('/api/transcribe',files={'audio':('voice.wav',wav(amplitude=4000),'audio/wav')})
    assert response.json()['raw_transcript']=='სხვა სიტყვა'
    assert observed=={'language':'ka','task':'transcribe','beam_size':5,'vad_filter':True,'condition_on_previous_text':False,'max_new_tokens':256}
    assert response.json()['processing_ms']>=0
    assert not service.inference_lock.locked()

def test_invalid_type(client):
    assert client.post('/api/transcribe',files={'audio':('a.txt',b'hello','text/plain')}).status_code==415

def test_invalid_decoder_input(client):
    assert client.post('/api/transcribe',files={'audio':('a.wav',b'not audio','audio/wav')}).status_code==422
    assert not service.inference_lock.locked()

def test_decoded_duration_is_bounded(client):
    assert client.post('/api/transcribe',files={'audio':('long.wav',wav(32),'audio/wav')}).status_code==422

def test_upload_is_bounded(client):
    assert client.post('/api/transcribe',files={'audio':('large.wav',b'x'*(service.MAX_BYTES+100000),'audio/wav')}).status_code==413

def test_empty_audio(client):
    assert client.post('/api/transcribe',files={'audio':('empty.wav',b'','audio/wav')}).status_code==422

def test_not_ready(client,monkeypatch):
    monkeypatch.setattr(service,'model_state','loading')
    assert client.post('/api/transcribe',files={'audio':('x.wav',wav(),'audio/wav')}).status_code==503

def test_busy(client):
    service.inference_lock.acquire()
    try:
        assert client.post('/api/transcribe',files={'audio':('x.wav',wav(),'audio/wav')}).status_code==429
    finally:
        service.inference_lock.release()

def test_disallowed_origin(client):
    assert client.post('/api/speak',headers={'Origin':'https://untrusted.invalid'},json={'text':'გამარჯობა'}).status_code==403

def test_tts_unavailable_is_explicit(client,monkeypatch):
    monkeypatch.setattr(service,'voice_available',False)
    assert client.post('/api/speak',json={'text':'გამარჯობა'}).status_code==503

def test_tts_rejects_unbounded_text(client):
    assert client.post('/api/speak',json={'text':'ა'*501}).status_code==422

def test_tts_passes_text_via_stdin(client,monkeypatch):
    observed={}
    def run(args,**kwargs):
        observed.update({'args':args,**kwargs})
        return SimpleNamespace(returncode=0,stdout=b'RIFFtest')
    monkeypatch.setattr(service,'voice_available',True)
    monkeypatch.setattr(service,'voice_binary','espeak-ng.exe')
    monkeypatch.setattr(service.subprocess,'run',run)
    text='გამარჯობა; $(command)'
    assert client.post('/api/speak',json={'text':text}).status_code==200
    assert text not in observed['args'] and observed['input']==(text+'\n').encode()
    assert observed['args'][observed['args'].index('-b')+1]=='1'
    assert not observed.get('shell',False)

def test_neural_voice_wav_and_speed(client,monkeypatch):
    observed={}
    def synthesize_wav(text,output,syn_config):
        observed.update(text=text,scale=syn_config.length_scale)
        output.setnchannels(1);output.setsampwidth(2);output.setframerate(22050)
        output.writeframes(b'\0\0'*2205)
    monkeypatch.setattr(service,'voice_available',True)
    monkeypatch.setattr(service,'neural_voice',SimpleNamespace(synthesize_wav=synthesize_wav))
    response=client.post('/api/speak',json={'text':'გამარჯობა','rate':110})
    assert response.status_code==200 and response.headers['content-type']=='audio/wav'
    with wave.open(io.BytesIO(response.content)) as f:
        assert f.getframerate()==22050 and f.getnframes()==2205
    assert observed=={'text':'გამარჯობა','scale':150/110}
    assert not service.voice_lock.locked()

def test_neural_voice_failure_releases_lock(client,monkeypatch):
    def fail(*args,**kwargs):raise RuntimeError('private model details')
    monkeypatch.setattr(service,'voice_available',True)
    monkeypatch.setattr(service,'neural_voice',SimpleNamespace(synthesize_wav=fail))
    response=client.post('/api/speak',json={'text':'გამარჯობა'})
    assert response.status_code==503 and 'private' not in response.text
    assert not service.voice_lock.locked()

def test_public_urls_are_not_invented(client):
    assert client.get('/api/config').json()['public_base_url'] is None

def test_unknown_api_not_spa(client):
    assert client.get('/api/not-found').status_code==404

def test_production_deep_link(client):
    if not service.DIST.exists():pytest.skip('Frontend must be built first')
    response=client.get('/practice')
    assert response.status_code==200 and '<div id="root">' in response.text
