import subprocess

import numpy as np

SAMPLE_RATE = 11025
FRAME_SECONDS = 1.0
HOP_SECONDS = 0.5
MIN_SECTION_SECONDS = 8.0
MAX_BOUNDARIES = 8


def _decode_to_mono_pcm(path: str) -> np.ndarray:
    cmd = [
        "ffmpeg", "-v", "error", "-i", path,
        "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-",
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return np.frombuffer(proc.stdout, dtype=np.float32)


def _frame_features(samples: np.ndarray) -> np.ndarray:
    frame_len = int(FRAME_SECONDS * SAMPLE_RATE)
    hop_len = int(HOP_SECONDS * SAMPLE_RATE)
    n_frames = max(0, (len(samples) - frame_len) // hop_len + 1)
    if n_frames < 2:
        return np.empty((0, 5))

    window = np.hanning(frame_len)
    freqs = np.fft.rfftfreq(frame_len, d=1 / SAMPLE_RATE)
    low_mask = freqs < 300
    mid_mask = (freqs >= 300) & (freqs < 3000)
    high_mask = freqs >= 3000

    features = np.empty((n_frames, 5))
    for i in range(n_frames):
        start = i * hop_len
        frame = samples[start : start + frame_len] * window
        rms = float(np.sqrt(np.mean(frame**2)) + 1e-9)
        spectrum = np.abs(np.fft.rfft(frame))
        total_energy = spectrum.sum() + 1e-9
        centroid = float((spectrum * freqs).sum() / total_energy)
        features[i] = [
            np.log(rms),
            centroid / 1000.0,
            spectrum[low_mask].sum() / total_energy,
            spectrum[mid_mask].sum() / total_energy,
            spectrum[high_mask].sum() / total_energy,
        ]
    return features


def _novelty_curve(features: np.ndarray, smooth: int = 3) -> np.ndarray:
    if len(features) < 2:
        return np.empty(0)
    std = features.std(axis=0)
    std[std < 1e-6] = 1.0
    norm = (features - features.mean(axis=0)) / std
    diffs = np.linalg.norm(np.diff(norm, axis=0), axis=1)
    if smooth > 1 and len(diffs) >= smooth:
        kernel = np.ones(smooth) / smooth
        diffs = np.convolve(diffs, kernel, mode="same")
    return diffs


def _pick_boundaries(novelty: np.ndarray) -> list[float]:
    if len(novelty) == 0:
        return []
    threshold = novelty.mean() + 0.75 * novelty.std()
    candidates = sorted(
        ((i, v) for i, v in enumerate(novelty) if v > threshold),
        key=lambda item: -item[1],
    )
    min_gap_frames = int(MIN_SECTION_SECONDS / HOP_SECONDS)
    chosen: list[int] = []
    for idx, _value in candidates:
        if all(abs(idx - c) >= min_gap_frames for c in chosen):
            chosen.append(idx)
        if len(chosen) >= MAX_BOUNDARIES:
            break
    chosen.sort()
    return [round(i * HOP_SECONDS, 2) for i in chosen]


def detect_section_boundaries(audio_path: str) -> list[float]:
    """Returns section start times in seconds (always includes 0.0 first),
    estimated from timbral/energy novelty of the reference track. Heuristic,
    not exact: meant as a starting point for the user to rename/adjust."""
    samples = _decode_to_mono_pcm(audio_path)
    if samples.size < SAMPLE_RATE * (FRAME_SECONDS + HOP_SECONDS):
        return [0.0]

    features = _frame_features(samples)
    novelty = _novelty_curve(features)
    boundaries = _pick_boundaries(novelty)
    return [0.0] + [b for b in boundaries if b > MIN_SECTION_SECONDS / 2]
