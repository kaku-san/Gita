"""Prepare generated masters for local web playback. No API calls or credentials."""
import hashlib, json, math, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ORIGINALS = ROOT / 'production/sound/originals'
OUTPUT = ROOT / 'web/audio/field'
OUTPUT.mkdir(parents=True, exist_ok=True)
bank = json.loads((ROOT / 'production/sound/battlefield.ready.json').read_text())
report = []
for layer in bank['layers']:
    name = Path(layer['src']).name
    source, target = ORIGINALS / name, OUTPUT / name
    channels = 2 if name == 'field-wind.mp3' else 1
    rate = 32000
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source), '-f', 'f32le', '-ar', str(rate), '-ac', str(channels), 'pipe:1'])
    data = np.frombuffer(raw, dtype='<f4').reshape(-1, channels).copy()
    assert np.isfinite(data).all() and len(data) > rate * 2, name
    seam = round(rate * .16) if layer['loop'] else 0
    if seam:
        # Overlap the end and beginning, then wrap at two adjacent source samples.
        ramp = np.linspace(0, 1, seam, dtype=np.float32)[:, None]
        blend = data[-seam:] * (1-ramp) + data[:seam] * ramp
        data = np.concatenate((data[seam:-seam], blend))
    else:
        edge = round(rate * .035)
        data[:edge] *= np.linspace(0, 1, edge, dtype=np.float32)[:, None]
        data[-edge:] *= np.linspace(1, 0, edge, dtype=np.float32)[:, None]
    rms = float(np.sqrt(np.mean(data.astype(np.float64)**2)))
    peak = float(np.max(np.abs(data)))
    assert rms > 1e-5, f'{name}: silent recording'
    gain = min(10**(-25/20)/rms, 10**(-4/20)/peak)
    data *= gain
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(rate), '-ac', str(channels), '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '128k' if channels == 2 else '96k', '-write_xing', '1', str(target)], input=data.astype('<f4').tobytes(), check=True)
    decoded = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(target), '-f', 'f32le', '-ar', str(rate), '-ac', str(channels), 'pipe:1']), dtype='<f4').reshape(-1, channels)
    assert np.isfinite(decoded).all() and np.max(np.abs(decoded)) < .9, name
    row = dict(file=name, source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(), runtime_sha256=hashlib.sha256(target.read_bytes()).hexdigest(), channels=channels, sample_rate=rate, seconds=round(len(decoded)/rate, 3), bytes=target.stat().st_size, loop_overlap_seconds=seam/rate, rms_dbfs=round(20*math.log10(float(np.sqrt(np.mean(decoded.astype(np.float64)**2)))), 2), peak_dbfs=round(20*math.log10(float(np.max(np.abs(decoded)))), 2), wrap_step=float(np.max(np.abs(decoded[-1]-decoded[0]))) if seam else None)
    report.append(row)
    print(f'{name}: {row["seconds"]}s, {row["bytes"]} bytes, peak {row["peak_dbfs"]} dBFS')
(ROOT / 'production/sound/preparation.json').write_text(json.dumps(dict(method='32 kHz; stereo wind, mono positional layers; 160 ms loop overlap; RMS normalization with peak ceiling', listening_review='pending', files=report), indent=2)+'\n')
(ROOT / 'web/audio/battlefield.json').write_text(json.dumps(bank, indent=2)+'\n')
