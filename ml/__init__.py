"""
ML module for IMU-based fall/activity detection.

This module provides:
- imu_fall_detection_pipeline: Core pipeline functions for data loading,
  feature extraction, model training, and evaluation.
"""

from .imu_fall_detection_pipeline import (
    load_all_sessions,
    make_windows,
    extract_features_for_windows,
    train_test_split_by_session,
    train_logistic_regression,
    train_random_forest,
    evaluate_model,
    run_full_pipeline,
)

__all__ = [
    'load_all_sessions',
    'make_windows',
    'extract_features_for_windows',
    'train_test_split_by_session',
    'train_logistic_regression',
    'train_random_forest',
    'evaluate_model',
    'run_full_pipeline',
]

