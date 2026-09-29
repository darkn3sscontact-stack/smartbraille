"""Read-only deployment verification. Run before setting PUBLIC_URL_VERIFIED=true."""
import sys
from urllib.parse import urlparse
import httpx
base=sys.argv[1].rstrip('/') if len(sys.argv)>1 else ''
parsed=urlparse(base)
if parsed.scheme!='https' or not parsed.hostname or parsed.hostname in {'localhost','127.0.0.1'}:
    raise SystemExit('Supply the actual HTTPS deployment base URL.')
with httpx.Client(timeout=20,follow_redirects=False) as client:
    for path in ['/','/lab','/instructions','/device','/api/health','/assets/device/device-overview-original.jpeg']:
        response=client.get(base+path)
        response.raise_for_status()
        if path=='/api/health':
            health=response.json()
            assert health['model_state']=='ready', 'Model is not ready'
            assert health['voice_available'], 'Georgian voice is not ready'
        print(response.status_code,base+path)
print('HTTP checks passed. A live second-device microphone trial remains required.')
