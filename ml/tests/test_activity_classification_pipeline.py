"""
Tests for ActivityClassificationPipeline (run from repo root):

  pytest ml/tests -q
or
  cd ml && pytest tests -q
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# Ensure `ml` directory is importable as flat modules (matches training scripts)
_ML_ROOT = Path(__file__).resolve().parents[1]
if str(_ML_ROOT) not in sys.path:
    sys.path.insert(0, str(_ML_ROOT))

from activity_classification_pipeline import (  # noqa: E402
    ActivityClassificationPipeline,
    ActivityPipelineConfig,
)


def _write_minimal_session_csv(path: Path, *, label: str = "st", ay: float = 9.8) -> None:
    """~1 s of samples at 20 ms; enough for one window. Vary ``ay`` / ``label`` for two-class smoke tests."""
    rows = []
    t = 0
    for _ in range(55):
        rows.append(
            {
                "timestamp_ms": t,
                "ax": 0.1,
                "ay": ay,
                "az": 0.1,
                "gx": 0.0,
                "gy": 0.05 if label == "w" else 0.0,
                "gz": 0.0,
                "bkk_time": "synthetic",
                "label": label,
            }
        )
        t += 20
    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)


def test_pipeline_config_defaults() -> None:
    c = ActivityPipelineConfig()
    assert c.window_size_s == 1.0
    assert c.test_size == 0.3


def test_pipeline_load_window_features(tmp_path: Path) -> None:
    csv = tmp_path / "session_1.csv"
    _write_minimal_session_csv(csv)
    pipe = ActivityClassificationPipeline()
    pipe.load_from_directory(str(tmp_path), "session_*.csv")
    pipe.run_windowing()
    fd, X, y = pipe.run_feature_extraction()
    assert len(fd) >= 1
    assert X.shape[0] == len(y)
    assert X.shape[1] == len(pipe.feature_names) == 32


def test_pipeline_train_eval_smoke(tmp_path: Path) -> None:
    """End-to-end smoke: four sessions (alternating labels) so train split has both classes."""
    labs = ["st", "w", "st", "w"]
    for i, lab in enumerate(labs, start=1):
        _write_minimal_session_csv(
            tmp_path / f"session_{i}.csv",
            label=lab,
            ay=9.7 if lab == "w" else 9.8,
        )
    pipe = ActivityClassificationPipeline(
        ActivityPipelineConfig(test_size=0.25, random_state=42)
    )
    pipe.load_from_directory(str(tmp_path), "session_*.csv")
    pipe.run_windowing()
    pipe.run_feature_extraction()
    pipe.run_train_test_split()
    assert pipe.X_train is not None and pipe.X_test is not None
    assert len(pipe.X_train) >= 1 and len(pipe.X_test) >= 1
    pipe.fit_logistic_regression()
    pipe.fit_random_forest()
    ev = pipe.evaluate_logistic_regression()
    assert "accuracy" in ev
    assert 0.0 <= ev["accuracy"] <= 1.0
