"""Generate one requested field layer. Credentials stay in the local project .env.

Usage: python scripts/generate-field-audio.py field-wind.mp3
No automatic retries: an ambiguous timeout can still have consumed credits.
"""
from pathlib import Path
import datetime
import hashlib
import json
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BRIEFS = ROOT / 'production/sound/generation-briefs.json'
OUTPUT = ROOT / 'production/sound/originals'
ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128'


def main():
    config = json.loads(BRIEFS.read_text())
    rows = {row['file']: row for row in config['layers']}
    if len(sys.argv) != 2 or sys.argv[1] not in rows:
        raise SystemExit('Pass exactly one filename from generation-briefs.json.')
    row = rows[sys.argv[1]]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / row['file']
    receipt = target.with_suffix('.json')
    if target.exists() or receipt.exists():
        raise SystemExit('An output or attempt receipt already exists. Review it before another paid request.')
    key = next((line.partition('=')[2].strip() for line in (ROOT / '.env').read_text().splitlines()
                if line.startswith('ELEVENLABS_API_KEY=')), '')
    if not key:
        raise SystemExit('ELEVENLABS_API_KEY is missing from the local .env.')
    payload = {'text': row['prompt'], 'duration_seconds': row['seconds'],
               'loop': row['loop'], 'model_id': config['model_id'], 'prompt_influence': 0.4}
    record = {'file': row['file'], 'requested_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'provider': 'ElevenLabs', 'request': payload, 'status': 'submitted'}
    receipt.write_text(json.dumps(record, indent=2) + '\n')
    request = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(),
        headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'}, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = response.read()
            record.update(character_cost=response.headers.get('character-cost'),
                          request_id=response.headers.get('request-id'),
                          content_type=response.headers.get('Content-Type'))
        if len(data) < 1024 or not (data[:3] == b'ID3' or data[0] == 255 and data[1] & 224 == 224):
            raise ValueError('Response is not an MP3 recording')
        target.write_bytes(data)
        record.update(status='generated', bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    except urllib.error.HTTPError as error:
        try:
            detail = json.loads(error.read()).get('detail', {})
        except (ValueError, AttributeError):
            detail = {}
        record.update(status='rejected', http_status=error.code,
            reason=detail.get('status') if isinstance(detail, dict) else None,
            message=str(detail.get('message', '') if isinstance(detail, dict) else detail).replace(key, '[redacted]')[:600])
    except Exception as error:
        record.update(status='outcome_unknown', error_type=type(error).__name__)
    receipt.write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps({k: v for k, v in record.items() if k != 'request'}), flush=True)
    if record['status'] != 'generated':
        raise SystemExit(1)


if __name__ == '__main__':
    main()
