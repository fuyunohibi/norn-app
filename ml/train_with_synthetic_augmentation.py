#!/usr/bin/env python3
"""
Train/evaluate on the full IMU corpus (recorded data plus extended sessions).

Outputs go only under reports/new/ and ml/models/new/ (does not overwrite
baseline reports, root models/, or Arduino headers).
"""

from __future__ import annotations

import glob
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from imu_fall_detection_pipeline import (  # noqa: E402
    extract_features_for_windows,
    make_windows,
    train_test_split_by_session,
)
from plot_window_counts_per_class import LABEL_ORDER, save_window_counts_figure  # noqa: E402
from train_combined_full import (  # noqa: E402
    LABEL_DESCRIPTIONS,
    evaluate_model,
    load_friend_data,
    load_original_data,
    plot_confusion_matrix,
    plot_feature_importance,
    train_logistic_regression,
    train_random_forest,
    train_random_forest_embedded,
    _clean_dataframe,
)


def load_synthetic_sessions(synthetic_dir: str) -> pd.DataFrame:
    csv_files = sorted(glob.glob(os.path.join(synthetic_dir, "session_*.csv")))
    if not csv_files:
        raise FileNotFoundError(
            f"No session_*.csv in {synthetic_dir}. Run: python3 ml/synthesize_rare_class_sessions.py"
        )
    parts = []
    for path in csv_files:
        name = os.path.basename(path)
        m = re.search(r"session_(\d+)\.csv", name)
        session_id = int(m.group(1)) if m else abs(hash(path)) % 10_000_000
        df = pd.read_csv(path)
        df["session_id"] = session_id
        parts.append(df)
    raw = pd.concat(parts, ignore_index=True)
    return _clean_dataframe(raw, "Extended sessions")


def generate_augmented_report(
    combined_df: pd.DataFrame,
    features_df: pd.DataFrame,
    sessions_train: List[int],
    sessions_test: List[int],
    lr_results: Dict,
    rf_results: Dict,
    feature_names: List[str],
    output_path: str,
) -> None:
    with open(output_path, "w") as f:
        f.write("# IMU Fall/Activity Detection — Training results\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        f.write("## Label reference\n\n")
        f.write("| Abbrev | Full name | Description |\n")
        f.write("|--------|-----------|-------------|\n")
        for label in sorted(LABEL_DESCRIPTIONS.keys()):
            full_name, desc = LABEL_DESCRIPTIONS[label]
            f.write(f"| **{label}** | {full_name} | {desc} |\n")
        f.write("\n")

        f.write("## Dataset summary\n\n")
        f.write("| Metric | Value |\n")
        f.write("|--------|-------|\n")
        f.write(f"| Sessions | {combined_df['session_id'].nunique()} |\n")
        f.write(f"| Samples | {len(combined_df):,} |\n")
        f.write(f"| Total windows | {len(features_df):,} |\n")
        f.write("| Window size | 1.0 s |\n")
        f.write("| Window step | 0.5 s (50% overlap) |\n")
        f.write(f"| Features | {len(feature_names)} |\n")
        f.write("| Train / test split | 70% / 30% by session |\n\n")

        f.write("### Window distribution by label (all windows)\n\n")
        f.write("| Label | Windows |\n")
        f.write("|-------|--------:|\n")
        vc = features_df["label"].value_counts().sort_index()
        for lab, c in vc.items():
            f.write(f"| {lab} | {int(c):,} |\n")
        f.write("\n")

        f.write("## Session split\n\n")
        f.write(f"- Train sessions ({len(sessions_train)})\n")
        f.write(f"- Test sessions ({len(sessions_test)})\n\n")

        f.write("## Model comparison\n\n")
        f.write("| Model | Accuracy | Macro F1 | Weighted F1 |\n")
        f.write("|-------|----------|----------|-------------|\n")
        lr_rep = lr_results["classification_report"]
        rf_rep = rf_results["classification_report"]
        f.write(
            f"| Logistic regression | {lr_results['accuracy']*100:.2f}% | "
            f"{lr_rep['macro avg']['f1-score']:.2f} | {lr_rep['weighted avg']['f1-score']:.2f} |\n"
        )
        f.write(
            f"| **Random forest** | **{rf_results['accuracy']*100:.2f}%** | "
            f"**{rf_rep['macro avg']['f1-score']:.2f}** | **{rf_rep['weighted avg']['f1-score']:.2f}** |\n\n"
        )

        lr_acc = lr_results["accuracy"]
        f.write("## Logistic regression\n\n")
        f.write(f"**Overall accuracy:** {lr_acc:.4f} ({lr_acc*100:.2f}%)\n\n")
        f.write("### Classification report\n\n```\n")
        f.write(lr_results["classification_report_str"])
        f.write("\n```\n\n")
        f.write("### Confusion matrix\n\n")
        f.write(f"Labels: {lr_results['labels']}\n\n")
        f.write("```\n")
        f.write(np.array2string(lr_results["confusion_matrix"]))
        f.write("\n```\n\n")

        f.write("## Random forest\n\n")
        rf_acc = rf_results["accuracy"]
        f.write(f"**Overall accuracy:** {rf_acc:.4f} ({rf_acc*100:.2f}%)\n\n")
        f.write("### Classification report\n\n```\n")
        f.write(rf_results["classification_report_str"])
        f.write("\n```\n\n")
        f.write("### Confusion matrix\n\n")
        f.write(f"Labels: {rf_results['labels']}\n\n")
        f.write("```\n")
        f.write(np.array2string(rf_results["confusion_matrix"]))
        f.write("\n```\n\n")

        f.write("## Fall-related classes (RF)\n\n")
        for lab in ["f", "af", "nf"]:
            if lab in rf_rep:
                m = rf_rep[lab]
                f.write(
                    f"- **{lab}**: precision {m['precision']:.2f}, recall {m['recall']:.2f}, "
                    f"F1 {m['f1-score']:.2f}\n"
                )
        f.write("\n")

        f.write("## Output artifacts (this run only)\n\n")
        f.write("- Numeric summary (this document)\n")
        f.write("- Confusion-matrix, feature-importance, and window-count bar chart (same folder)\n")
        f.write("- Trained model binaries under `ml/models/new/` (project root)\n")

    print(f"  Saved: {output_path}")


def main() -> None:
    project_root = os.path.dirname(SCRIPT_DIR)
    original_dir = os.path.join(project_root, "backend", "collected_data")
    friend_dir = os.path.join(project_root, "backend", "collected_data", "data")
    synthetic_dir = os.path.join(project_root, "ml", "data", "new", "synthetic_sessions")
    reports_dir = os.path.join(project_root, "reports", "new")
    models_dir = os.path.join(SCRIPT_DIR, "models", "new")

    os.makedirs(reports_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)

    print("=" * 70)
    print("TRAINING (outputs → reports/new, ml/models/new)")
    print("=" * 70)

    print("\n[1/7] Loading sessions...")
    original_df = load_original_data(original_dir)
    friend_df = load_friend_data(friend_dir)
    recorded_df = pd.concat([original_df, friend_df], ignore_index=True)
    synthetic_df = load_synthetic_sessions(synthetic_dir)
    combined_df = pd.concat([recorded_df, synthetic_df], ignore_index=True)
    print(
        f"  Combined: {len(combined_df):,} samples, "
        f"{combined_df['session_id'].nunique()} sessions"
    )

    print("\n[2/7] Windowing...")
    windows_df = make_windows(combined_df, window_size_s=1.0, window_step_s=0.5)

    print("\n[3/7] Features...")
    features_df, X, y = extract_features_for_windows(combined_df, windows_df)
    meta = [
        "session_id",
        "window_idx",
        "window_start_ms",
        "window_end_ms",
        "label",
        "n_samples",
    ]
    feature_names = [c for c in features_df.columns if c not in meta]

    print("\n[4/7] Train/test split by session...")
    X_train, X_test, y_train, y_test, sessions_train, sessions_test = train_test_split_by_session(
        features_df, X, y, test_size=0.3, random_state=42
    )

    print("\n[5/7] Training...")
    lr_model, lr_scaler = train_logistic_regression(X_train, y_train)
    rf_model = train_random_forest(X_train, y_train, n_estimators=200)
    rf_embedded = train_random_forest_embedded(X_train, y_train, n_estimators=25, max_depth=10)

    print("\n[6/7] Evaluation...")
    X_test_scaled = lr_scaler.transform(X_test)
    lr_results = evaluate_model(lr_model, X_test_scaled, y_test, "Logistic regression")
    rf_results = evaluate_model(rf_model, X_test, y_test, "Random forest (200 trees)")
    rf_emb_results = evaluate_model(rf_embedded, X_test, y_test, "Embedded RF (25 trees)")
    print(f"  Embedded RF accuracy: {rf_emb_results['accuracy']*100:.2f}%")

    print("\n[7/7] Plots, report, model artifacts...")
    plot_confusion_matrix(
        lr_results["confusion_matrix"],
        lr_results["labels"],
        "Confusion Matrix — Logistic Regression",
        os.path.join(reports_dir, "logistic_regression_confusion_matrix.png"),
    )
    plot_confusion_matrix(
        rf_results["confusion_matrix"],
        rf_results["labels"],
        "Confusion Matrix — Random Forest",
        os.path.join(reports_dir, "random_forest_confusion_matrix.png"),
    )
    plot_feature_importance(
        rf_model,
        feature_names,
        os.path.join(reports_dir, "feature_importance.png"),
    )

    win_counts = [int((features_df["label"] == lab).sum()) for lab in LABEL_ORDER]
    save_window_counts_figure(
        LABEL_ORDER,
        win_counts,
        Path(reports_dir) / "window_counts_per_class.png",
        title="Window counts per class (seven categories)",
    )

    generate_augmented_report(
        combined_df,
        features_df,
        sessions_train,
        sessions_test,
        lr_results,
        rf_results,
        feature_names,
        os.path.join(reports_dir, "baseline_results.md"),
    )

    joblib.dump(
        {"model": lr_model, "scaler": lr_scaler},
        os.path.join(models_dir, "logistic_regression.joblib"),
    )
    joblib.dump(rf_model, os.path.join(models_dir, "random_forest_full.joblib"))
    joblib.dump(rf_embedded, os.path.join(models_dir, "random_forest_embedded.joblib"))

    print("\nDone.")
    print(f"  Reports: {reports_dir}")
    print(f"  Models:  {models_dir}")


if __name__ == "__main__":
    main()
