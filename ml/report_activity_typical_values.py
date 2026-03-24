#!/usr/bin/env python3
"""
Build per-activity typical values (combined dataset) and write reports/activity_typical_values.md.

Uses the same loading, windowing (1.0 s / 0.5 s step), and 32 features as the training pipeline.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from imu_fall_detection_pipeline import make_windows, extract_features_for_windows
from train_combined_full import (
    load_original_data,
    load_friend_data,
    LABEL_DESCRIPTIONS,
)


LABEL_ORDER = ["af", "f", "nf", "r", "si", "st", "w"]

# Subset for the main “readable” table (full 32 in appendix)
HIGHLIGHT_FEATURES = [
    "a_mag_mean",
    "a_mag_std",
    "a_mag_max",
    "w_mag_mean",
    "w_mag_std",
    "w_mag_max",
    "az_std",
    "gy_std",
]


def _project_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load_combined() -> pd.DataFrame:
    root = _project_root()
    original_dir = os.path.join(root, "backend", "collected_data")
    friend_dir = os.path.join(root, "backend", "collected_data", "data")
    a = load_original_data(original_dir)
    b = load_friend_data(friend_dir)
    return pd.concat([a, b], ignore_index=True)


def _raw_sample_magnitudes(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    d["a_mag"] = np.sqrt(d["ax"] ** 2 + d["ay"] ** 2 + d["az"] ** 2)
    d["w_mag"] = np.sqrt(d["gx"] ** 2 + d["gy"] ** 2 + d["gz"] ** 2)
    return d


def _fmt_mean_pm_std(mean: float, std: float) -> str:
    return f"{mean:.3f} ± {std:.3f}"


def main() -> None:
    root = _project_root()
    reports_dir = os.path.join(root, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    out_path = os.path.join(reports_dir, "activity_typical_values.md")

    print("Loading combined data...")
    combined = _load_combined()
    n_sessions = combined["session_id"].nunique()

    print("Per-sample magnitude stats...")
    mag_df = _raw_sample_magnitudes(combined)
    raw_rows = []
    for lab in LABEL_ORDER:
        s = mag_df.loc[mag_df["label"] == lab]
        if len(s) == 0:
            continue
        raw_rows.append(
            {
                "label": lab,
                "n_samples": len(s),
                "a_mag": _fmt_mean_pm_std(s["a_mag"].mean(), s["a_mag"].std()),
                "w_mag": _fmt_mean_pm_std(s["w_mag"].mean(), s["w_mag"].std()),
            }
        )
    raw_table = pd.DataFrame(raw_rows)

    def df_to_md(t: pd.DataFrame) -> list[str]:
        cols = [str(c) for c in t.columns]
        out = ["| " + " | ".join(cols) + " |", "| " + " | ".join(["---"] * len(cols)) + " |"]
        for _, r in t.iterrows():
            out.append("| " + " | ".join(str(x) for x in r) + " |")
        return out

    print("Windows + features (this may take a few minutes)...")
    windows_df = make_windows(combined, window_size_s=1.0, window_step_s=0.5)
    features_df, _, _ = extract_features_for_windows(combined, windows_df)

    meta = {
        "session_id",
        "window_idx",
        "window_start_ms",
        "window_end_ms",
        "label",
        "n_samples",
    }
    feature_names = [c for c in features_df.columns if c not in meta]

    # Optional: order highlight features by trained RF importance
    models_dir = os.path.join(root, "ml", "models")
    rf_path = os.path.join(models_dir, "random_forest_full.joblib")
    highlight_ordered = list(HIGHLIGHT_FEATURES)
    if os.path.isfile(rf_path):
        try:
            import joblib

            rf = joblib.load(rf_path)
            imp = rf.feature_importances_
            if len(imp) != len(feature_names):
                raise ValueError("RF feature count does not match current feature columns")
            idx = np.argsort(imp)[::-1]
            ranked = [feature_names[i] for i in idx if feature_names[i] in HIGHLIGHT_FEATURES]
            rest = [f for f in HIGHLIGHT_FEATURES if f not in ranked]
            highlight_ordered = ranked + rest
        except Exception as e:
            print(f"  (Could not load RF for feature ordering: {e})")

    win_counts = features_df["label"].value_counts().reindex(LABEL_ORDER).fillna(0).astype(int)

    # Per-label mean and std across windows (typical value = mean; spread = std across windows)
    lines: list[str] = []
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines.append("# Activity differentiation — typical values (combined dataset)")
    lines.append("")
    lines.append(f"Generated: {ts}")
    lines.append("")
    lines.append(
        "This report summarizes **typical IMU statistics** for each activity label using the "
        "same preprocessing as the Random Forest model: **1.0 s** windows, **0.5 s** step, "
        "majority label per window, and **32** window-level features "
        "(mean, std, min, max for `ax`–`az`, `a_mag`, `gx`–`gz`, `w_mag`)."
    )
    lines.append("")
    lines.append("## Label reference")
    lines.append("")
    lines.append("| Code | Name | Description |")
    lines.append("|------|------|-------------|")
    for code in LABEL_ORDER:
        if code in LABEL_DESCRIPTIONS:
            full, desc = LABEL_DESCRIPTIONS[code]
            lines.append(f"| **{code}** | {full} | {desc} |")
    lines.append("")
    lines.append("## Dataset scope")
    lines.append("")
    lines.append(f"- **Samples (rows):** {len(combined):,}")
    lines.append(f"- **Sessions:** {n_sessions}")
    lines.append(f"- **Windows:** {len(features_df):,}")
    lines.append("")
    lines.append(
        "**Source mix:** The combined dataset merges your `session_*.csv` recordings with the "
        "friend’s `movement_*.csv` files. The friend’s files only contain labels **si**, **st**, "
        "**w**, and **nf**; windows for **af**, **f**, and **r** therefore come from your original "
        "sessions. Interpret rare-class typical values with the smaller **n_windows** for **f** and **r** in mind."
    )
    lines.append("")
    lines.append("### Windows per label")
    lines.append("")
    lines.append("| Label | Windows |")
    lines.append("|-------|--------:|")
    for lab in LABEL_ORDER:
        lines.append(f"| {lab} | {int(win_counts.get(lab, 0))} |")
    lines.append("")

    lines.append("## 1. Raw per-sample magnitudes (entire trace)")
    lines.append("")
    lines.append(
        "Each row is one IMU sample. **a_mag** = $\\sqrt{a_x^2+a_y^2+a_z^2}$ (m/s²), "
        "**w_mag** = $\\sqrt{g_x^2+g_y^2+g_z^2}$ (rad/s). "
        "Values are **mean ± std** across all samples with that label."
    )
    lines.append("")
    lines.extend(df_to_md(raw_table))
    lines.append("")

    lines.append("## 2. Typical window-level features (what the classifier sees)")
    lines.append("")
    lines.append(
        "For each window, features are computed from all samples inside the window. "
        "Below, **typical value** = **mean across windows** of that feature; "
        "the **±** term is the **standard deviation across windows** (how much windows vary), "
        "not the std inside a single window."
    )
    lines.append("")
    lines.append("### Highlighted features")
    lines.append("")

    hl = [f for f in highlight_ordered if f in feature_names]
    header = "| Label | n_windows | " + " | ".join(hl) + " |"
    lines.append(header)
    lines.append("| " + " | ".join(["---"] * (2 + len(hl))) + " |")

    for lab in LABEL_ORDER:
        sub = features_df.loc[features_df["label"] == lab]
        n_w = len(sub)
        if n_w == 0:
            continue
        cells = [_fmt_mean_pm_std(sub[c].mean(), sub[c].std()) for c in hl]
        lines.append("| " + lab + " | " + str(n_w) + " | " + " | ".join(cells) + " |")
    lines.append("")

    lines.append("### All 32 features (mean ± std across windows)")
    lines.append("")
    feat_header = "| Feature | " + " | ".join(LABEL_ORDER) + " |"
    lines.append(feat_header)
    lines.append("| " + " | ".join(["---"] * (1 + len(LABEL_ORDER))) + " |")
    for feat in feature_names:
        row = [feat]
        for lab in LABEL_ORDER:
            sub = features_df.loc[features_df["label"] == lab, feat]
            if len(sub) == 0:
                row.append("—")
            else:
                row.append(_fmt_mean_pm_std(float(sub.mean()), float(sub.std())))
        lines.append("| " + " | ".join(row) + " |")
    lines.append("")

    def _m(col: str, lab: str) -> float:
        sub = features_df.loc[features_df["label"] == lab, col]
        return float(sub.mean()) if len(sub) else float("nan")

    si_wm, st_wm = _m("w_mag_mean", "si"), _m("w_mag_mean", "st")
    si_as, st_as = _m("a_mag_std", "si"), _m("a_mag_std", "st")
    w_amax, r_amax = _m("a_mag_max", "w"), _m("a_mag_max", "r")
    w_astd, r_astd = _m("a_mag_std", "w"), _m("a_mag_std", "r")
    nf_wm, nf_as = _m("w_mag_mean", "nf"), _m("a_mag_std", "nf")
    f_amax, af_amax = _m("a_mag_max", "f"), _m("a_mag_max", "af")

    lines.append("## 3. How to read this for the thesis")
    lines.append("")
    lines.append(
        f"- **Seated vs standing:** **Sitting** (**si**) windows are very stable in this dataset "
        f"(mean `w_mag_mean` ≈ **{si_wm:.2f}** rad/s, mean `a_mag_std` ≈ **{si_as:.2f}** m/s² across windows), "
        f"whereas **standing** (**st**) shows higher rotation and acceleration variability "
        f"(`w_mag_mean` ≈ **{st_wm:.2f}**, `a_mag_std` ≈ **{st_as:.2f}**), which helps separate posture despite "
        "similar net acceleration near 1 g."
    )
    lines.append(
        f"- **Walking vs running:** **Walking** reaches lower peak acceleration in typical windows than **running** "
        f"(mean `a_mag_max` ≈ **{w_amax:.1f}** vs **{r_amax:.1f}** m/s²; mean `a_mag_std` ≈ **{w_astd:.2f}** vs "
        f"**{r_astd:.2f}** m/s²), matching stronger periodic impacts and torso motion while jogging."
    )
    lines.append(
        f"- **Near fall** (**nf**): mean `w_mag_mean` ≈ **{nf_wm:.2f}** rad/s and `a_mag_std` ≈ **{nf_as:.2f}** m/s² "
        "sit between calm standing and walking in this corpus—consistent with sway and balance corrections."
    )
    lines.append(
        f"- **Falling** (**f**) vs **after fall** (**af**): **falling** windows show the highest typical peaks "
        f"(`a_mag_max` mean ≈ **{f_amax:.1f}** m/s² vs **{af_amax:.1f}** for **af**), while **af** is closer to "
        "quiet standing in mean magnitude but still more heterogeneous across windows than **sitting**, aligning "
        "with lying on the floor and recovery motion."
    )
    lines.append(
        "- The **Random Forest** combines all 32 dimensions; use `reports/feature_importance.png` "
        "with this table to justify which statistics drive separation."
    )
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append(
        "**Regenerate:** from the repository root, run `python ml/report_activity_typical_values.py` "
        "(requires dependencies in `ml/requirements.txt`)."
    )
    lines.append("")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
