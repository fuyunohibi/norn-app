#!/usr/bin/env python3
"""
Generate synthetic IMU sessions for rare classes by resampling real per-class data
with temporal smoothing and random jitter (does not replace recorded data).

Output: ml/data/new/synthetic_sessions/session_*.csv
"""

from __future__ import annotations

import os
import re
import sys
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from train_combined_full import load_friend_data, load_original_data  # noqa: E402

# Target: ~1 minute per session at 50 Hz, with variation
SAMPLE_RATE_HZ = 50
DT_MS = 1000 // SAMPLE_RATE_HZ
DURATION_SAMPLES_RANGE = (55 * SAMPLE_RATE_HZ, 65 * SAMPLE_RATE_HZ)  # inclusive/exclusive handled below

# Five underrepresented motion/fall classes (standing/sitting come from recordings only)
SYNTH_LABELS = ["f", "af", "nf", "r", "w"]
SESSIONS_PER_LABEL = 100

# Session IDs far above recorded ranges (sessions + movement offsets)
SESSION_ID_START = 500_001

COLS6 = ["ax", "ay", "az", "gx", "gy", "gz"]


def _build_pools(combined: pd.DataFrame) -> Dict[str, np.ndarray]:
    pools: Dict[str, np.ndarray] = {}
    for lab in SYNTH_LABELS:
        sub = combined[combined["label"] == lab]
        if len(sub) < 5:
            raise RuntimeError(
                f"Too few real samples for label '{lab}' ({len(sub)}). "
                "Cannot build a synthesis pool."
            )
        pools[lab] = sub[COLS6].to_numpy(dtype=np.float64)
    return pools


def _ema_smooth(x: np.ndarray, alpha: float) -> np.ndarray:
    """x: (n, 6)"""
    out = np.empty_like(x)
    out[0] = x[0]
    for t in range(1, len(x)):
        out[t] = alpha * out[t - 1] + (1.0 - alpha) * x[t]
    return out


def _synthesize_one_session(
    pool: np.ndarray,
    label: str,
    rng: np.random.Generator,
    n_samples: int,
) -> np.ndarray:
    """Return (n_samples, 6) IMU rows."""
    std_axis = pool.std(axis=0) + 1e-4
    mean_axis = pool.mean(axis=0)

    idx = rng.integers(0, len(pool), size=n_samples)
    raw = pool[idx].copy()

    alpha = float(rng.uniform(0.10, 0.42))
    smoothed = _ema_smooth(raw, alpha)

    noise_scale = float(rng.uniform(0.07, 0.22))
    noise = rng.normal(0.0, 1.0, size=smoothed.shape) * (noise_scale * std_axis)
    out = smoothed + noise

    # Per-session mild global scaling (axes drift)
    acc_scale = float(rng.uniform(0.90, 1.12))
    gyr_scale = float(rng.uniform(0.88, 1.15))
    out[:, :3] *= acc_scale
    out[:, 3:] *= gyr_scale

    if label == "f":
        t0 = int(n_samples // 4 + rng.integers(0, max(1, n_samples // 3)))
        dur = int(rng.integers(8, 35))
        t1 = min(n_samples, t0 + dur)
        burst = rng.normal(0.0, 1.0, size=(t1 - t0, 6)) * (2.2 * std_axis)
        out[t0:t1] += burst

    if label == "af":
        half = n_samples // 2
        damp = float(rng.uniform(0.45, 0.88))
        out[half:, 3:] *= damp
        out[half:, :3] += rng.normal(0, 0.15, size=(n_samples - half, 3)) * std_axis[:3]

    if label == "nf":
        osc = np.sin(np.linspace(0, rng.uniform(4.0, 14.0), n_samples))[:, None]
        out[:, 3:] += (0.25 * std_axis[3:]) * osc

    if label == "r":
        osc = np.sin(np.linspace(0, rng.uniform(10.0, 28.0), n_samples))[:, None]
        out[:, 3:] += (0.55 * std_axis[3:]) * osc
        out[:, :3] += (0.12 * std_axis[:3]) * osc

    if label == "w":
        osc = np.sin(np.linspace(0, rng.uniform(3.0, 12.0), n_samples))[:, None]
        out[:, 3:] += (0.35 * std_axis[3:]) * osc

    # Soft pull toward class mean to avoid runaway values
    out = mean_axis + 0.92 * (out - mean_axis)

    return out.astype(np.float64)


def write_session_csv(
    path: str,
    session_id: int,
    imu: np.ndarray,
    label: str,
) -> None:
    n = imu.shape[0]
    ts = (np.arange(n, dtype=np.int64) * DT_MS).tolist()
    df = pd.DataFrame(
        {
            "timestamp_ms": ts,
            "ax": imu[:, 0],
            "ay": imu[:, 1],
            "az": imu[:, 2],
            "gx": imu[:, 3],
            "gy": imu[:, 4],
            "gz": imu[:, 5],
            "bkk_time": ["synthetic"] * n,
            "label": [label] * n,
        }
    )
    df.to_csv(path, index=False)


def main() -> None:
    project_root = os.path.dirname(SCRIPT_DIR)
    original_dir = os.path.join(project_root, "backend", "collected_data")
    friend_dir = os.path.join(project_root, "backend", "collected_data", "data")
    out_dir = os.path.join(project_root, "ml", "data", "new", "synthetic_sessions")

    print("Loading recorded data to estimate per-class IMU distributions...")
    orig = load_original_data(original_dir)
    friend = load_friend_data(friend_dir)
    combined = pd.concat([orig, friend], ignore_index=True)

    pools = _build_pools(combined)
    for lab in SYNTH_LABELS:
        print(f"  Pool '{lab}': {len(pools[lab]):,} rows")

    os.makedirs(out_dir, exist_ok=True)
    rng = np.random.default_rng(42)

    sid = SESSION_ID_START
    manifest: List[Tuple[int, str, int]] = []

    for lab in SYNTH_LABELS:
        pool = pools[lab]
        for _ in range(SESSIONS_PER_LABEL):
            n = int(rng.integers(DURATION_SAMPLES_RANGE[0], DURATION_SAMPLES_RANGE[1] + 1))
            imu = _synthesize_one_session(pool, lab, rng, n)
            path = os.path.join(out_dir, f"session_{sid}.csv")
            write_session_csv(path, sid, imu, lab)
            manifest.append((sid, lab, n))
            sid += 1

    man_path = os.path.join(out_dir, "_manifest.txt")
    with open(man_path, "w") as f:
        f.write("# session_id,label,n_samples\n")
        for row in manifest:
            f.write(f"{row[0]},{row[1]},{row[2]}\n")

    print(f"\nWrote {len(manifest)} sessions to {out_dir}")
    print(f"Manifest: {man_path}")


if __name__ == "__main__":
    main()
