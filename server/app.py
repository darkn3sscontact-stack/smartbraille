"""Local, same-origin Georgian speech service. Audio is never retained."""
from __future__ import annotations
import asyncio
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import io
import os
from pathlib import Path
import shutil
import subprocess
import threading
import time
import wave

# Suppress native crash dialogs in this process and its children only. A failed
# optional voice executable must return an API error, never block the desktop.
if os.name == 'nt':
    import ctypes
    previous_mode = ctypes.windll.kernel32.SetErrorMode(0x0001 | 0x0002)
    ctypes.windll.kernel32.SetErrorMode(previous_mode | 0x0001 | 0x0002)
SUBPROCESS_FLAGS = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0

import av
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
import numpy as np
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')
BUILD = '1.0.0'
MODEL = os.getenv('WHISPER_MODEL', 'models/georgian-turbo')
DEVICE = os.getenv('WHISPER_DEVICE', 'cpu')
COMPUTE = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')
MAX_SECONDS = min(60, max(1, int(os.getenv('MAX_AUDIO_SECONDS', '30'))))
MAX_BYTES = min(12_000_000, int(os.getenv('MAX_AUDIO_BYTES', '6000000')))
ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173,http://127.0.0.1:5173').split(',')
model = None
model_state = 'loading'
model_error = None
voice_available = False
voice_binary = None
neural_voice = None
voice_engine = None
inference_lock = threading.Lock()
voice_lock = threading.Lock()
requests_by_ip: dict[str, deque] = defaultdict(deque)

def utc():
    return datetime.now(timezone.utc).isoformat()

def find_voice():
    global voice_available, voice_binary, neural_voice, voice_engine
    voice_available, voice_engine, neural_voice = False, None, None
    if os.getenv('TTS_ENGINE', 'piper') == 'piper':
        try:
            from piper import PiperVoice
            path = ROOT/os.getenv('PIPER_MODEL', 'models/piper/ka/ka_GE/natia/medium/ka_GE-natia-medium.onnx')
            neural_voice = PiperVoice.load(str(path))
            voice_available, voice_engine = True, 'Piper / Natia / ka-GE'
        except Exception:
            # No silent fallback to an unwanted robotic/system voice.
            voice_available, voice_engine = False, None
        return
    candidates = [os.getenv('ESPEAK_PATH', ''), str(ROOT/'tools/espeak-ng/espeak-ng.exe'), shutil.which('espeak-ng')]
    for candidate in candidates:
        if not candidate:
            continue
        p = Path(candidate)
        if not p.is_absolute():
            p = ROOT/p
        if not p.is_file():
            continue
        try:
            result = subprocess.run([str(p), '--path='+str(p.parent), '--voices=ka'], capture_output=True, timeout=10, creationflags=SUBPROCESS_FLAGS)
            if result.returncode == 0 and any(' ka ' in (' '+line+' ') for line in result.stdout.decode(errors='replace').splitlines()[1:]):
                voice_binary, voice_available = str(p), True
                voice_engine = 'eSpeak NG / ka'
                return
        except (OSError, subprocess.TimeoutExpired):
            continue

def load_model():
    global model, model_state, model_error
    try:
        if MODEL.endswith('.en') or MODEL.startswith('distil-'):
            raise ValueError('Choose a multilingual model for Georgian.')
        from faster_whisper import WhisperModel
        model_path = str((ROOT/MODEL).resolve()) if (ROOT/MODEL).is_dir() else MODEL
        model = WhisperModel(model_path, device=DEVICE, compute_type=COMPUTE,
            cpu_threads=int(os.getenv('WHISPER_THREADS', '4')),
            download_root=str(ROOT/os.getenv('MODEL_DOWNLOAD_ROOT', 'models')),
            local_files_only=os.getenv('MODEL_LOCAL_ONLY', 'true').lower() == 'true')
        model_state = 'ready'
    except Exception as exc:
        model_state, model_error = 'error', type(exc).__name__

@asynccontextmanager
async def lifespan(app):
    await asyncio.to_thread(find_voice)
    task = asyncio.create_task(asyncio.to_thread(load_model))
    yield
    await task

app = FastAPI(title='Georgian Braille local speech', version=BUILD, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=['GET','POST'], allow_headers=['Content-Type'])

@app.middleware('http')
async def limits(request: Request, call_next):
    if request.url.path.startswith('/api/') and request.method == 'POST':
        origin = request.headers.get('origin')
        if origin and origin not in ORIGINS:
            return JSONResponse({'detail':'ეს მისამართი დაშვებული არ არის.'}, status_code=403)
        try:
            length = int(request.headers.get('content-length', '0'))
        except ValueError:
            return JSONResponse({'detail':'მოთხოვნის ზომა არასწორია.'}, status_code=400)
        if length > MAX_BYTES + 65536:
            return JSONResponse({'detail':'ჩანაწერი მეტისმეტად დიდია.'}, status_code=413)
        if length <= 0:
            return JSONResponse({'detail':'საჭიროა მოთხოვნის ზომის მითითება.'}, status_code=411)
        ip = request.client.host if request.client else 'local'
        now = time.monotonic()
        if len(requests_by_ip) > 100:
            for key in list(requests_by_ip):
                if not requests_by_ip[key] or now-requests_by_ip[key][-1] > 60:
                    del requests_by_ip[key]
        bucket = requests_by_ip[ip]
        while bucket and now-bucket[0] > 60:
            bucket.popleft()
        if len(bucket) >= 30:
            return JSONResponse({'detail':'ცოტა ხანში გაიმეორეთ — მოთხოვნების ლიმიტი ამოიწურა.'}, status_code=429)
        bucket.append(now)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'same-origin'
    if request.url.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    return response

@app.get('/api/health')
def health():
    return {'build':BUILD, 'model_state':model_state, 'model':MODEL, 'device':DEVICE,
        'compute_type':COMPUTE, 'language':'ka', 'engine':'faster-whisper',
        'model_error':model_error, 'voice_available':voice_available,
        'voice_engine':voice_engine if voice_available else None,
        'max_audio_seconds':MAX_SECONDS, 'max_audio_bytes':MAX_BYTES,
        'busy':inference_lock.locked(), 'timestamp':utc()}

@app.get('/api/config')
def public_config():
    base = os.getenv('PUBLIC_BASE_URL','').rstrip('/')
    verified = os.getenv('PUBLIC_URL_VERIFIED','false').lower() == 'true'
    return {'public_base_url':base if base.startswith('https://') and verified else None,
        'second_device_check':'pending'}

def decode_audio(data: bytes):
    chunks = []
    count = 0
    try:
        with av.open(io.BytesIO(data)) as container:
            if not container.streams.audio:
                raise ValueError('no audio')
            stream = container.streams.audio[0]
            if stream.duration is not None and float(stream.duration*stream.time_base) > MAX_SECONDS+0.5:
                raise HTTPException(422, 'ჩანაწერი აღემატება დასაშვებ ხანგრძლივობას.')
            resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
            for frame in container.decode(stream):
                for resampled in resampler.resample(frame):
                    samples = resampled.to_ndarray().flatten()
                    count += len(samples)
                    if count > (MAX_SECONDS+0.5)*16000:
                        raise HTTPException(422, 'ჩანაწერი აღემატება დასაშვებ ხანგრძლივობას.')
                    chunks.append(samples)
            for resampled in resampler.resample(None):
                chunks.append(resampled.to_ndarray().flatten())
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, 'აუდიოს წაკითხვა ვერ მოხერხდა. სცადეთ ახალი ჩანაწერი.')
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    audio = np.concatenate(chunks).astype(np.float32)/32768.0
    if len(audio) > (MAX_SECONDS+0.5)*16000:
        raise HTTPException(422, 'ჩანაწერი მეტისმეტად ხანგრძლივია.')
    return audio

def transcribe_bytes(data):
    start = time.perf_counter()
    started = utc()
    try:
        audio = decode_audio(data)
        duration = len(audio)/16000
        raw = ''
        if duration >= .15 and float(np.sqrt(np.mean(audio**2))) > .001:
            # No reference word, expected answer, initial_prompt or hotwords enter ASR.
            segments, _info = model.transcribe(audio, language='ka', task='transcribe',
                beam_size=5, vad_filter=True, condition_on_previous_text=False, max_new_tokens=256)
            raw = ''.join(segment.text for segment in segments).strip()
        return {'raw_transcript':raw, 'language':'ka', 'engine':'faster-whisper', 'model':MODEL,
            'state':'ok' if raw else 'no-speech', 'duration_seconds':round(duration,3),
            'processing_ms':round((time.perf_counter()-start)*1000),
            'processing_started_at':started,'processing_ended_at':utc()}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, 'მეტყველების ამოცნობა ვერ დასრულდა. სცადეთ ხელახლა ან გამოიყენეთ ტექსტი.')
    finally:
        inference_lock.release()

@app.post('/api/transcribe')
async def transcribe(audio: UploadFile = File(...)):
    try:
        if (audio.content_type or '').split(';')[0] not in {'audio/webm','audio/ogg','audio/wav','audio/x-wav','audio/mp4','audio/mpeg'}:
            raise HTTPException(415, 'აუდიოს ეს ფორმატი არ არის მხარდაჭერილი.')
        data = await audio.read(MAX_BYTES+1)
        if len(data) > MAX_BYTES:
            raise HTTPException(413, 'ჩანაწერი მეტისმეტად დიდია.')
        if not data:
            raise HTTPException(422, 'ჩანაწერი ცარიელია.')
        if model_state != 'ready':
            raise HTTPException(503, 'მეტყველების მოდელი მზად არ არის. გამოიყენეთ ტექსტის შეყვანა ან შეამოწმეთ სერვისი.')
        if not inference_lock.acquire(blocking=False):
            raise HTTPException(429, 'სერვისი ამუშავებს სხვა ჩანაწერს. ცოტა ხანში გაიმეორეთ.')
        task = asyncio.create_task(asyncio.to_thread(transcribe_bytes, data))
        # Worker retains the lock until inference finishes, even if the client disconnects.
        return await asyncio.shield(task)
    finally:
        await audio.close()

class Speech(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    rate: int = Field(default=150, ge=90, le=220)

def synthesize(text, rate):
    try:
        if neural_voice is not None:
            from piper import SynthesisConfig
            output = io.BytesIO()
            with wave.open(output, 'wb') as wav:
                neural_voice.synthesize_wav(text, wav,
                    syn_config=SynthesisConfig(length_scale=150/rate, volume=.8))
            return output.getvalue()
        result = subprocess.run([voice_binary, '--path='+str(Path(voice_binary).parent), '-v', 'ka', '-b', '1', '-s', str(rate), '--stdout', '--stdin'],
            input=(text+'\n').encode('utf-8'), capture_output=True, timeout=20, creationflags=SUBPROCESS_FLAGS)
        if result.returncode or not result.stdout.startswith(b'RIFF'):
            raise HTTPException(503, 'ხმის შექმნა ვერ მოხერხდა.')
        return result.stdout
    except subprocess.TimeoutExpired:
        raise HTTPException(504, 'გახმოვანების დრო ამოიწურა.')
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, 'ხმის შექმნა ვერ მოხერხდა. სცადეთ ხელახლა.')
    finally:
        voice_lock.release()

@app.post('/api/speak')
async def speak(payload: Speech):
    if not payload.text.strip():
        raise HTTPException(422, 'შეიყვანეთ ტექსტი.')
    if not voice_available:
        raise HTTPException(503, 'ქართული ხმა არ არის დაყენებული. გამოიყენეთ ტექსტური ინსტრუქცია.')
    if not voice_lock.acquire(blocking=False):
        raise HTTPException(429, 'ხმის სერვისი დაკავებულია.')
    task = asyncio.create_task(asyncio.to_thread(synthesize,payload.text,payload.rate))
    return Response(await asyncio.shield(task), media_type='audio/wav')

DIST = ROOT/'web/dist'
if DIST.exists():
    app.mount('/assets',StaticFiles(directory=DIST/'assets'),name='assets')
    app.mount('/documents',StaticFiles(directory=DIST/'documents'),name='documents')

@app.get('/{path:path}')
def frontend(path: str):
    if path.startswith('api/'):
        raise HTTPException(404)
    if DIST.exists():
        candidate = (DIST/path).resolve()
        if candidate.is_relative_to(DIST.resolve()) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST/'index.html')
    return JSONResponse({'detail':'Build the frontend: cd web; npm run build'},status_code=503)
