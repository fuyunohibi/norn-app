"""
Object-oriented IMU activity classification pipeline.

Wraps the functional steps in ``imu_fall_detection_pipeline`` so training/evaluation
can be driven from a single class instance (thesis / V&V friendly).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

try:
    from .imu_fall_detection_pipeline import (
        evaluate_model,
        extract_features_for_windows,
        load_all_sessions,
        make_windows,
        train_logistic_regression,
        train_random_forest,
        train_random_forest_embedded,
        train_test_split_by_session,
    )
except ImportError:  # script-style: `cd ml` without package parent
    from imu_fall_detection_pipeline import (
        evaluate_model,
        extract_features_for_windows,
        load_all_sessions,
        make_windows,
        train_logistic_regression,
        train_random_forest,
        train_random_forest_embedded,
        train_test_split_by_session,
    )


@dataclass
class ActivityPipelineConfig:
    """Hyperparameters and windowing settings."""

    window_size_s: float = 1.0
    window_step_s: float = 0.5
    test_size: float = 0.3
    random_state: int = 42
    lr_max_iter: int = 1000
    rf_n_estimators: int = 200
    rf_embedded_n_estimators: int = 25
    rf_embedded_max_depth: int = 10


class ActivityClassificationPipeline:
    """
    End-to-end workflow: load samples → windows → features → split → train → evaluate.

    Attributes are populated as each stage runs; call stages in order or use
    ``load_from_dataframe`` after assembling a DataFrame elsewhere.
    """

    METADATA_COLS: Tuple[str, ...] = (
        "session_id",
        "window_idx",
        "window_start_ms",
        "window_end_ms",
        "label",
        "n_samples",
    )

    def __init__(self, config: Optional[ActivityPipelineConfig] = None) -> None:
        self.config = config or ActivityPipelineConfig()
        self.samples: Optional[pd.DataFrame] = None
        self.windows: Optional[pd.DataFrame] = None
        self.features_df: Optional[pd.DataFrame] = None
        self.X: Optional[np.ndarray] = None
        self.y: Optional[np.ndarray] = None
        self.feature_names: List[str] = []

        self.X_train: Optional[np.ndarray] = None
        self.X_test: Optional[np.ndarray] = None
        self.y_train: Optional[np.ndarray] = None
        self.y_test: Optional[np.ndarray] = None
        self.sessions_train: List[int] = []
        self.sessions_test: List[int] = []

        self.lr_model: Any = None
        self.lr_scaler: Any = None
        self.rf_model: Any = None
        self.rf_embedded_model: Any = None

        self.lr_eval: Optional[Dict[str, Any]] = None
        self.rf_eval: Optional[Dict[str, Any]] = None
        self.rf_embedded_eval: Optional[Dict[str, Any]] = None

    def load_from_directory(self, data_dir: str, file_pattern: str = "session_*.csv") -> pd.DataFrame:
        """Load all session CSV files into ``self.samples``."""
        self.samples = load_all_sessions(data_dir, file_pattern)
        return self.samples

    def load_from_dataframe(self, df: pd.DataFrame) -> None:
        """Use an in-memory corpus (e.g. combined recorded + extended sessions)."""
        self.samples = df.copy()

    def run_windowing(self) -> pd.DataFrame:
        """Build sliding windows from ``self.samples``."""
        if self.samples is None:
            raise RuntimeError("No samples loaded. Call load_from_directory or load_from_dataframe first.")
        self.windows = make_windows(
            self.samples,
            window_size_s=self.config.window_size_s,
            window_step_s=self.config.window_step_s,
        )
        return self.windows

    def run_feature_extraction(self) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray]:
        """Compute window-level feature matrix ``X`` and labels ``y``."""
        if self.samples is None or self.windows is None:
            raise RuntimeError("Need samples and windows before feature extraction.")
        self.features_df, self.X, self.y = extract_features_for_windows(self.samples, self.windows)
        self.feature_names = [
            c for c in self.features_df.columns if c not in self.METADATA_COLS
        ]
        return self.features_df, self.X, self.y

    def run_train_test_split(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Session-level split; fills X_train, X_test, y_train, y_test."""
        if self.features_df is None or self.X is None or self.y is None:
            raise RuntimeError("Run run_feature_extraction first.")
        (
            self.X_train,
            self.X_test,
            self.y_train,
            self.y_test,
            self.sessions_train,
            self.sessions_test,
        ) = train_test_split_by_session(
            self.features_df,
            self.X,
            self.y,
            test_size=self.config.test_size,
            random_state=self.config.random_state,
        )
        return self.X_train, self.X_test, self.y_train, self.y_test

    def fit_logistic_regression(self) -> Tuple[Any, Any]:
        if self.X_train is None or self.y_train is None:
            raise RuntimeError("Run run_train_test_split first.")
        self.lr_model, self.lr_scaler = train_logistic_regression(
            self.X_train,
            self.y_train,
            max_iter=self.config.lr_max_iter,
            random_state=self.config.random_state,
        )
        return self.lr_model, self.lr_scaler

    def fit_random_forest(self) -> Any:
        if self.X_train is None or self.y_train is None:
            raise RuntimeError("Run run_train_test_split first.")
        self.rf_model = train_random_forest(
            self.X_train,
            self.y_train,
            n_estimators=self.config.rf_n_estimators,
            random_state=self.config.random_state,
        )
        return self.rf_model

    def fit_random_forest_embedded(self) -> Any:
        if self.X_train is None or self.y_train is None:
            raise RuntimeError("Run run_train_test_split first.")
        self.rf_embedded_model = train_random_forest_embedded(
            self.X_train,
            self.y_train,
            n_estimators=self.config.rf_embedded_n_estimators,
            max_depth=self.config.rf_embedded_max_depth,
            random_state=self.config.random_state,
        )
        return self.rf_embedded_model

    def evaluate_logistic_regression(self) -> Dict[str, Any]:
        if self.lr_model is None or self.lr_scaler is None or self.X_test is None or self.y_test is None:
            raise RuntimeError("Fit LR and ensure test split exists.")
        Xs = self.lr_scaler.transform(self.X_test)
        self.lr_eval = evaluate_model(self.lr_model, Xs, self.y_test, "Logistic regression")
        return self.lr_eval

    def evaluate_random_forest(self) -> Dict[str, Any]:
        if self.rf_model is None or self.X_test is None or self.y_test is None:
            raise RuntimeError("Fit RF and ensure test split exists.")
        self.rf_eval = evaluate_model(self.rf_model, self.X_test, self.y_test, "Random forest")
        return self.rf_eval

    def evaluate_random_forest_embedded(self) -> Dict[str, Any]:
        if self.rf_embedded_model is None or self.X_test is None or self.y_test is None:
            raise RuntimeError("Fit embedded RF and ensure test split exists.")
        self.rf_embedded_eval = evaluate_model(
            self.rf_embedded_model,
            self.X_test,
            self.y_test,
            "Embedded random forest",
        )
        return self.rf_embedded_eval

    def run_through_split(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray]:
        """Convenience: load DataFrame → windows → features (no training)."""
        self.load_from_dataframe(df)
        self.run_windowing()
        return self.run_feature_extraction()
