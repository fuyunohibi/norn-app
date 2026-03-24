#!/usr/bin/env python3
"""
Full Training Pipeline with Combined Data

This script:
1. Loads and combines original + friend's data
2. Trains Logistic Regression and Random Forest models
3. Generates confusion matrix plots
4. Generates feature importance plot
5. Creates comprehensive baseline_results.md report
6. Exports embedded model for ESP32
"""

import os
import sys
import glob
import re
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from typing import Tuple, Dict, List, Optional
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    f1_score
)

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from imu_fall_detection_pipeline import (
    make_windows,
    extract_features_for_windows,
    train_test_split_by_session,
)


# =============================================================================
# Label Mapping
# =============================================================================

LABEL_MAPPING = {
    # Full names → abbreviated
    'standing': 'st',
    'sitting': 'si',
    'walking': 'w',
    'running': 'r',
    'falling': 'f',
    'unstable_standing': 'nf',
    'after_fall_on_floor': 'af',
    
    # Typo fixes
    'sittting': 'si',
    'unstable': 'nf',
    
    # Transition states → standing (user requested)
    'sit_to_stand': 'st',
    'stand_to_sit': 'st',
    
    # Floor states → after fall
    'getting_up_from_fall': 'af',
    'getting_up_from_floor': 'af',
}

LABEL_DESCRIPTIONS = {
    'st': ('standing', 'Normal standing position'),
    'si': ('sitting', 'Seated position'),
    'w': ('walking', 'Walking/moving'),
    'r': ('running', 'Running/jogging'),
    'f': ('falling', 'Active fall in progress'),
    'nf': ('near fall', 'Unstable standing (early warning)'),
    'af': ('after fall', 'On floor after fall (needs help)'),
}


# =============================================================================
# Data Loading
# =============================================================================

def load_original_data(data_dir: str) -> pd.DataFrame:
    """Load original session_*.csv files."""
    csv_files = sorted(glob.glob(os.path.join(data_dir, "session_*.csv")))
    
    if not csv_files:
        raise FileNotFoundError(f"No session_*.csv files found in {data_dir}")
    
    print(f"Found {len(csv_files)} session files")
    
    all_dfs = []
    
    for csv_path in csv_files:
        filename = os.path.basename(csv_path)
        match = re.search(r'session_(\d+)\.csv', filename)
        session_id = int(match.group(1)) if match else hash(filename) % 10000
        
        df = pd.read_csv(csv_path)
        df['session_id'] = session_id
        all_dfs.append(df)
    
    combined_df = pd.concat(all_dfs, ignore_index=True)
    return _clean_dataframe(combined_df, "Original")


def load_friend_data(data_dir: str) -> pd.DataFrame:
    """Load friend's movement_*.csv files."""
    csv_files = sorted(glob.glob(os.path.join(data_dir, "movement_*.csv")))
    
    if not csv_files:
        raise FileNotFoundError(f"No movement_*.csv files found in {data_dir}")
    
    print(f"Found {len(csv_files)} movement files")
    
    all_dfs = []
    
    for csv_path in csv_files:
        filename = os.path.basename(csv_path)
        match = re.search(r'movement_(\d+)\.csv', filename)
        # Add 1000 offset to avoid ID collision with session files
        session_id = int(match.group(1)) + 1000 if match else hash(filename) % 10000 + 1000
        
        df = pd.read_csv(csv_path)
        df['session_id'] = session_id
        
        # Add placeholder bkk_time if missing
        if 'bkk_time' not in df.columns:
            df['bkk_time'] = 'unknown'
        
        all_dfs.append(df)
    
    combined_df = pd.concat(all_dfs, ignore_index=True)
    return _clean_dataframe(combined_df, "Friend's")


def _clean_dataframe(df: pd.DataFrame, source_name: str) -> pd.DataFrame:
    """Clean and standardize dataframe."""
    # Convert dtypes
    df['timestamp_ms'] = pd.to_numeric(df['timestamp_ms'], errors='coerce').astype('Int64')
    for col in ['ax', 'ay', 'az', 'gx', 'gy', 'gz']:
        df[col] = pd.to_numeric(df[col], errors='coerce').astype(float)
    df['label'] = df['label'].astype(str)
    
    # Map labels
    df['label'] = df['label'].replace(LABEL_MAPPING)
    
    # Remove invalid labels
    invalid_mask = (
        df['label'].str.contains('timestamp_ms', na=False) |
        df['label'].str.contains('label', na=False) |
        (df['label'].str.strip() == '') |
        df['label'].isna()
    )
    if invalid_mask.any():
        print(f"  Removed {invalid_mask.sum()} rows with invalid labels")
        df = df[~invalid_mask]
    
    # Drop NaN rows
    df = df.dropna(subset=['timestamp_ms', 'ax', 'ay', 'az', 'gx', 'gy', 'gz', 'label'])
    df = df.sort_values(['session_id', 'timestamp_ms']).reset_index(drop=True)
    
    print(f"  {source_name} data: {len(df):,} samples")
    print(f"  Labels: {df['label'].value_counts().to_dict()}")
    
    return df


# =============================================================================
# Model Training
# =============================================================================

def train_logistic_regression(X_train: np.ndarray, y_train: np.ndarray) -> Tuple[LogisticRegression, StandardScaler]:
    """Train Logistic Regression model with scaling."""
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    
    model = LogisticRegression(
        max_iter=2000,
        solver='lbfgs',
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train_scaled, y_train)
    return model, scaler


def train_random_forest(X_train: np.ndarray, y_train: np.ndarray, 
                        n_estimators: int = 200) -> RandomForestClassifier:
    """Train Random Forest model."""
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    return model


def train_random_forest_embedded(X_train: np.ndarray, y_train: np.ndarray,
                                  n_estimators: int = 25,
                                  max_depth: int = 10) -> RandomForestClassifier:
    """Train optimized Random Forest for ESP32."""
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    return model


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray, 
                   model_name: str) -> Dict:
    """Evaluate model and return results dict."""
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    report_str = classification_report(y_test, y_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=sorted(set(y_test)))
    
    print(f"\n{model_name}")
    print(f"  Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    
    return {
        'model_name': model_name,
        'accuracy': accuracy,
        'predictions': y_pred,
        'classification_report': report,
        'classification_report_str': report_str,
        'confusion_matrix': cm,
        'labels': sorted(set(y_test))
    }


# =============================================================================
# Visualization
# =============================================================================

def plot_confusion_matrix(cm: np.ndarray, labels: List[str], 
                          title: str, output_path: str):
    """Plot and save confusion matrix."""
    plt.figure(figsize=(10, 8))
    
    # Normalize for display
    cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
    
    # Create heatmap
    sns.heatmap(
        cm_normalized,
        annot=cm,  # Show raw counts
        fmt='d',
        cmap='Blues',
        xticklabels=labels,
        yticklabels=labels,
        square=True,
        cbar_kws={'label': 'Normalized'}
    )
    
    plt.title(title, fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label', fontsize=12)
    plt.ylabel('True Label', fontsize=12)
    plt.tight_layout()
    
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"  Saved: {output_path}")


def plot_feature_importance(model: RandomForestClassifier, 
                            feature_names: List[str],
                            output_path: str,
                            top_n: int = 20):
    """Plot and save feature importance."""
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1][:top_n]
    
    plt.figure(figsize=(12, 8))
    
    # Create horizontal bar chart
    colors = plt.cm.viridis(np.linspace(0.3, 0.9, top_n))
    
    y_pos = np.arange(top_n)
    plt.barh(y_pos, importances[indices][::-1], color=colors)
    plt.yticks(y_pos, [feature_names[i] for i in indices[::-1]])
    
    plt.xlabel('Feature Importance', fontsize=12)
    plt.ylabel('Feature', fontsize=12)
    plt.title(f'Top {top_n} Feature Importances (Random Forest)', fontsize=14, fontweight='bold')
    plt.tight_layout()
    
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"  Saved: {output_path}")


# =============================================================================
# Report Generation
# =============================================================================

def generate_baseline_report(
    df: pd.DataFrame,
    original_df: pd.DataFrame,
    friend_df: pd.DataFrame,
    features_df: pd.DataFrame,
    X_train: np.ndarray,
    X_test: np.ndarray,
    y_train: np.ndarray,
    y_test: np.ndarray,
    sessions_train: List[int],
    sessions_test: List[int],
    lr_results: Dict,
    rf_results: Dict,
    feature_names: List[str],
    output_path: str
):
    """Generate comprehensive baseline_results.md report."""
    
    with open(output_path, 'w') as f:
        f.write("# IMU Fall/Activity Detection - Combined Data Results\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("**Dataset**: Combined (original + friend's data)\n\n")
        
        # Label reference
        f.write("## Label Reference\n\n")
        f.write("| Abbrev | Full Name | Description |\n")
        f.write("|--------|-----------|-------------|\n")
        for label in sorted(LABEL_DESCRIPTIONS.keys()):
            full_name, desc = LABEL_DESCRIPTIONS[label]
            f.write(f"| **{label}** | {full_name} | {desc} |\n")
        f.write("\n")
        
        # Dataset summary
        f.write("## Dataset Summary\n\n")
        f.write("### Data Sources\n\n")
        f.write("| Source | Sessions | Samples | Windows |\n")
        f.write("|--------|----------|---------|--------|\n")
        
        orig_sessions = original_df['session_id'].nunique()
        friend_sessions = friend_df['session_id'].nunique()
        total_sessions = df['session_id'].nunique()
        
        f.write(f"| Original (your data) | {orig_sessions} | {len(original_df):,} | - |\n")
        f.write(f"| Friend's data | {friend_sessions} | {len(friend_df):,} | - |\n")
        f.write(f"| **Combined** | **{total_sessions}** | **{len(df):,}** | **{len(features_df):,}** |\n\n")
        
        f.write("### Configuration\n\n")
        f.write("| Metric | Value |\n")
        f.write("|--------|-------|\n")
        f.write(f"| Total sessions | {total_sessions} |\n")
        f.write(f"| Total samples | {len(df):,} |\n")
        f.write(f"| Total windows | {len(features_df):,} |\n")
        f.write("| Window size | 1.0 second |\n")
        f.write("| Window step | 0.5 second (50% overlap) |\n")
        f.write(f"| Features | {len(feature_names)} (mean, std, min, max for ax, ay, az, a_mag, gx, gy, gz, w_mag) |\n")
        f.write("| Train/Test split | 70% / 30% by session |\n\n")
        
        # Window distribution
        f.write("### Window Distribution by Label\n\n")
        f.write("| Label | Train | Test | Total |\n")
        f.write("|-------|-------|------|-------|\n")
        
        train_dist = pd.Series(y_train).value_counts()
        test_dist = pd.Series(y_test).value_counts()
        
        for label in sorted(set(y_train) | set(y_test)):
            train_count = train_dist.get(label, 0)
            test_count = test_dist.get(label, 0)
            total = train_count + test_count
            full_name = LABEL_DESCRIPTIONS.get(label, (label, ''))[0]
            f.write(f"| {label} ({full_name}) | {train_count:,} | {test_count:,} | {total:,} |\n")
        f.write("\n")
        
        # Dataset split
        f.write("## Dataset Split\n\n")
        f.write(f"- **Train sessions** ({len(sessions_train)}): {sorted(sessions_train)[:20]}{'...' if len(sessions_train) > 20 else ''}\n")
        f.write(f"- **Test sessions** ({len(sessions_test)}): {sorted(sessions_test)[:20]}{'...' if len(sessions_test) > 20 else ''}\n\n")
        
        # Model comparison
        f.write("## Model Comparison Summary\n\n")
        f.write("| Model | Accuracy | Macro F1 | Weighted F1 |\n")
        f.write("|-------|----------|----------|-------------|\n")
        
        lr_acc = lr_results['accuracy']
        rf_acc = rf_results['accuracy']
        lr_macro = lr_results['classification_report']['macro avg']['f1-score']
        rf_macro = rf_results['classification_report']['macro avg']['f1-score']
        lr_weighted = lr_results['classification_report']['weighted avg']['f1-score']
        rf_weighted = rf_results['classification_report']['weighted avg']['f1-score']
        
        f.write(f"| Logistic Regression | {lr_acc*100:.2f}% | {lr_macro:.2f} | {lr_weighted:.2f} |\n")
        f.write(f"| **Random Forest** | **{rf_acc*100:.2f}%** | **{rf_macro:.2f}** | **{rf_weighted:.2f}** |\n\n")
        
        # Logistic Regression details
        f.write("## Logistic Regression\n\n")
        f.write(f"**Overall Accuracy:** {lr_acc:.4f} ({lr_acc*100:.2f}%)\n\n")
        f.write("### Classification Report\n\n")
        f.write("```\n")
        f.write(lr_results['classification_report_str'])
        f.write("```\n\n")
        f.write("### Confusion Matrix\n\n")
        f.write(f"Labels: {lr_results['labels']}\n\n")
        f.write("```\n")
        f.write(np.array2string(lr_results['confusion_matrix']))
        f.write("\n```\n\n")
        
        # Random Forest details
        f.write("## Random Forest\n\n")
        f.write(f"**Overall Accuracy:** {rf_acc:.4f} ({rf_acc*100:.2f}%)\n\n")
        f.write("### Classification Report\n\n")
        f.write("```\n")
        f.write(rf_results['classification_report_str'])
        f.write("```\n\n")
        f.write("### Confusion Matrix\n\n")
        f.write(f"Labels: {rf_results['labels']}\n\n")
        f.write("```\n")
        f.write(np.array2string(rf_results['confusion_matrix']))
        f.write("\n```\n\n")
        
        # Key findings
        f.write("## Key Findings\n\n")
        
        rf_report = rf_results['classification_report']
        
        # Best performing classes
        f1_scores = [(label, rf_report[label]['f1-score']) 
                     for label in rf_results['labels'] 
                     if label in rf_report]
        f1_scores.sort(key=lambda x: x[1], reverse=True)
        
        f.write("### Best Performing Classes (Random Forest F1)\n")
        for label, f1 in f1_scores[:4]:
            full_name = LABEL_DESCRIPTIONS.get(label, (label, ''))[0]
            f.write(f"1. **{label} ({full_name})**: {f1:.2f}\n")
        f.write("\n")
        
        f.write("### Most Challenging Classes\n")
        for label, f1 in f1_scores[-2:]:
            full_name = LABEL_DESCRIPTIONS.get(label, (label, ''))[0]
            f.write(f"1. **{label} ({full_name})**: {f1:.2f}\n")
        f.write("\n")
        
        # Fall detection performance
        f.write("### Fall Detection Performance\n")
        for label in ['f', 'af', 'nf']:
            if label in rf_report:
                m = rf_report[label]
                f.write(f"- **{LABEL_DESCRIPTIONS[label][0].title()} ({label})**: ")
                f.write(f"Precision {m['precision']*100:.0f}%, ")
                f.write(f"Recall {m['recall']*100:.0f}%, ")
                f.write(f"F1 {m['f1-score']:.2f}\n")
        f.write("\n")
        
        # Activity detection performance
        f.write("### Activity Detection Performance\n")
        for label in ['r', 'w', 'st', 'si']:
            if label in rf_report:
                m = rf_report[label]
                best = " ⭐ (best)" if f1_scores[0][0] == label else ""
                f.write(f"- **{LABEL_DESCRIPTIONS[label][0].title()} ({label})**: ")
                f.write(f"Precision {m['precision']*100:.0f}%, ")
                f.write(f"Recall {m['recall']*100:.0f}%, ")
                f.write(f"F1 {m['f1-score']:.2f}{best}\n")
        f.write("\n")
        
        # Generated files
        f.write("## Generated Files\n\n")
        f.write("- `baseline_results.md` - This report\n")
        f.write("- `random_forest_confusion_matrix.png` - RF confusion matrix visualization\n")
        f.write("- `logistic_regression_confusion_matrix.png` - LR confusion matrix visualization\n")
        f.write("- `feature_importance.png` - Top features from Random Forest\n")
    
    print(f"  Saved: {output_path}")


# =============================================================================
# ESP32 Export
# =============================================================================

def export_model_to_c(model, output_path: str, model_name: str = "fall_model"):
    """Export sklearn model to C header file using emlearn."""
    try:
        import emlearn
    except ImportError:
        print("ERROR: emlearn not installed. Run: pip install emlearn")
        return False
    
    cmodel = emlearn.convert(model, method='inline', dtype='float')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cmodel.save(file=output_path, name=model_name)
    print(f"  Model exported: {output_path}")
    return True


def generate_features_header(output_path: str, feature_names: List[str]):
    """Generate features.h header file."""
    content = """/*
 * Feature definitions for IMU fall detection
 * Auto-generated by train_combined_full.py
 */

#ifndef FEATURES_H
#define FEATURES_H

// Number of features
#define N_FEATURES 32

// Feature indices (for reference)
"""
    for i, name in enumerate(feature_names):
        content += f"#define FEAT_{name.upper()} {i}\n"
    
    content += """
// Feature names (for debugging)
static const char* FEATURE_NAMES[N_FEATURES] = {
"""
    for name in feature_names:
        content += f'    "{name}",\n'
    content = content.rstrip(',\n') + '\n'
    content += "};\n\n#endif // FEATURES_H\n"
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(content)
    print(f"  Features header: {output_path}")


def generate_labels_header(output_path: str, labels: List[str]):
    """Generate labels.h header file with state machine."""
    content = """/*
 * Label definitions for IMU fall detection
 * Auto-generated by train_combined_full.py
 */

#ifndef LABELS_H
#define LABELS_H

// Number of classes
"""
    content += f"#define N_CLASSES {len(labels)}\n\n"
    content += "// Class indices\n"
    
    for i, label in enumerate(labels):
        content += f"#define CLASS_{label.upper()} {i}\n"
    
    content += """
// Class names
static const char* CLASS_NAMES[N_CLASSES] = {
"""
    for label in labels:
        content += f'    "{label}",\n'
    content = content.rstrip(',\n') + '\n'
    content += "};\n\n"
    
    # Critical labels function
    content += """// Critical labels that trigger alerts
// f = falling, af = after_fall_on_floor, nf = unstable_standing (near fall)
static inline bool is_critical_label(int class_idx) {
"""
    critical_indices = [str(i) for i, label in enumerate(labels) if label in ['f', 'af', 'nf']]
    if critical_indices:
        content += f"    return class_idx == {' || class_idx == '.join(critical_indices)};\n"
    else:
        content += "    return false;\n"
    content += "}\n\n"
    
    # State machine transitions
    # Labels are sorted: af, f, nf, r, si, st, w
    content += """// State machine transition rules
// Rows = from state, Cols = to state
// Rules:
//   - st, si, w, r, nf can go to any state EXCEPT af
//   - f (falling) can only go to f or af
//   - af (after fall) can only go to af, si, st (recovery)
static const bool VALID_TRANSITIONS[N_CLASSES][N_CLASSES] = {
    // To:    af     f      nf     r      si     st     w
"""
    
    # Build transition matrix based on sorted labels
    label_to_idx = {label: i for i, label in enumerate(labels)}
    
    for from_label in labels:
        row = []
        for to_label in labels:
            if from_label == 'f':
                # falling can only go to f or af
                valid = to_label in ['f', 'af']
            elif from_label == 'af':
                # after fall can go to af, si, st (recovery)
                valid = to_label in ['af', 'si', 'st']
            else:
                # st, si, w, r, nf can go to any state EXCEPT af
                valid = to_label != 'af'
            row.append('true' if valid else 'false')
        
        comment = {
            'af': 'after fall: can go to af, si, st (recovery)',
            'f': 'falling: can only go to f, af',
            'nf': 'unstable: can go to any EXCEPT af',
            'r': 'running: can go to any EXCEPT af',
            'si': 'sitting: can go to any EXCEPT af',
            'st': 'standing: can go to any EXCEPT af',
            'w': 'walking: can go to any EXCEPT af',
        }.get(from_label, '')
        
        content += f"    {{ {', '.join(f'{v:5s}' for v in row)} }}, // {from_label}: {comment}\n"
    
    content += """};\n
// Check if transition from current state to new state is valid
static inline bool is_valid_transition(int from_state, int to_state) {
    if (from_state < 0 || from_state >= N_CLASSES) return true;
    if (to_state < 0 || to_state >= N_CLASSES) return false;
    return VALID_TRANSITIONS[from_state][to_state];
}

// Get valid next state (returns ml_prediction if valid, else stays in current_state)
static inline int get_valid_next_state(int current_state, int ml_prediction) {
    if (is_valid_transition(current_state, ml_prediction)) {
        return ml_prediction;
    }
    return current_state;
}

#endif // LABELS_H
"""
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(content)
    print(f"  Labels header: {output_path}")


# =============================================================================
# Main Pipeline
# =============================================================================

def main():
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    original_data_dir = os.path.join(project_root, "backend", "collected_data")
    friend_data_dir = os.path.join(project_root, "backend", "collected_data", "data")
    reports_dir = os.path.join(project_root, "reports")
    models_dir = os.path.join(script_dir, "models")
    arduino_dir = os.path.join(project_root, "arduino", "mpu6050_ml")
    arduino_serial_dir = os.path.join(project_root, "arduino", "mpu6050_ml_serial")
    
    os.makedirs(reports_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)
    
    print("=" * 70)
    print("COMBINED DATA TRAINING PIPELINE")
    print("=" * 70)
    
    # Step 1: Load data
    print("\n[1/8] Loading data...")
    original_df = load_original_data(original_data_dir)
    friend_df = load_friend_data(friend_data_dir)
    
    combined_df = pd.concat([original_df, friend_df], ignore_index=True)
    print(f"\n  Combined: {len(combined_df):,} samples from {combined_df['session_id'].nunique()} sessions")
    
    # Step 2: Create windows
    print("\n[2/8] Creating windows...")
    windows_df = make_windows(combined_df, window_size_s=1.0, window_step_s=0.5)
    
    # Step 3: Extract features
    print("\n[3/8] Extracting features...")
    features_df, X, y = extract_features_for_windows(combined_df, windows_df)
    
    metadata_cols = ['session_id', 'window_idx', 'window_start_ms', 'window_end_ms', 'label', 'n_samples']
    feature_names = [c for c in features_df.columns if c not in metadata_cols]
    class_labels = sorted(features_df['label'].unique())
    
    print(f"  Features: {len(feature_names)}")
    print(f"  Classes: {class_labels}")
    
    # Step 4: Train/test split
    print("\n[4/8] Splitting train/test by session...")
    X_train, X_test, y_train, y_test, sessions_train, sessions_test = train_test_split_by_session(
        features_df, X, y, test_size=0.3, random_state=42
    )
    print(f"  Train: {len(X_train)} windows from {len(sessions_train)} sessions")
    print(f"  Test: {len(X_test)} windows from {len(sessions_test)} sessions")
    
    # Step 5: Train models
    print("\n[5/8] Training models...")
    
    print("  Training Logistic Regression (with scaling)...")
    lr_model, lr_scaler = train_logistic_regression(X_train, y_train)
    
    print("  Training Random Forest (200 trees)...")
    rf_model = train_random_forest(X_train, y_train, n_estimators=200)
    
    print("  Training Embedded Random Forest (25 trees, depth=10)...")
    rf_embedded = train_random_forest_embedded(X_train, y_train, n_estimators=25, max_depth=10)
    
    # Step 6: Evaluate models
    print("\n[6/8] Evaluating models...")
    X_test_scaled = lr_scaler.transform(X_test)
    lr_results = evaluate_model(lr_model, X_test_scaled, y_test, "Logistic Regression")
    rf_results = evaluate_model(rf_model, X_test, y_test, "Random Forest (200 trees)")
    rf_embedded_results = evaluate_model(rf_embedded, X_test, y_test, "Embedded RF (25 trees)")
    
    # Step 7: Generate visualizations and report
    print("\n[7/8] Generating visualizations and report...")
    
    plot_confusion_matrix(
        lr_results['confusion_matrix'],
        lr_results['labels'],
        "Logistic Regression - Confusion Matrix (Combined Data)",
        os.path.join(reports_dir, "logistic_regression_confusion_matrix.png")
    )
    
    plot_confusion_matrix(
        rf_results['confusion_matrix'],
        rf_results['labels'],
        "Random Forest - Confusion Matrix (Combined Data)",
        os.path.join(reports_dir, "random_forest_confusion_matrix.png")
    )
    
    plot_feature_importance(
        rf_model,
        feature_names,
        os.path.join(reports_dir, "feature_importance.png")
    )
    
    generate_baseline_report(
        combined_df, original_df, friend_df, features_df,
        X_train, X_test, y_train, y_test,
        sessions_train, sessions_test,
        lr_results, rf_results,
        feature_names,
        os.path.join(reports_dir, "baseline_results.md")
    )
    
    # Step 8: Export for ESP32
    print("\n[8/8] Exporting for ESP32...")
    
    export_model_to_c(rf_embedded, os.path.join(arduino_dir, "fall_model.h"))
    generate_features_header(os.path.join(arduino_dir, "features.h"), feature_names)
    generate_labels_header(os.path.join(arduino_dir, "labels.h"), class_labels)
    
    # Copy to serial folder
    import shutil
    for filename in ["fall_model.h", "features.h", "labels.h"]:
        src = os.path.join(arduino_dir, filename)
        dst = os.path.join(arduino_serial_dir, filename)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  Copied to serial: {dst}")
    
    # Save models
    joblib.dump({'model': lr_model, 'scaler': lr_scaler}, os.path.join(models_dir, "logistic_regression.joblib"))
    joblib.dump(rf_model, os.path.join(models_dir, "random_forest_full.joblib"))
    joblib.dump(rf_embedded, os.path.join(models_dir, "random_forest_embedded.joblib"))
    print(f"  Models saved to: {models_dir}")
    
    # Summary
    print("\n" + "=" * 70)
    print("TRAINING COMPLETE")
    print("=" * 70)
    
    print(f"\nResults (Combined Data - {len(combined_df):,} samples):")
    print(f"  Logistic Regression: {lr_results['accuracy']*100:.2f}%")
    print(f"  Random Forest (full): {rf_results['accuracy']*100:.2f}%")
    print(f"  Random Forest (embedded): {rf_embedded_results['accuracy']*100:.2f}%")
    
    print(f"\nGenerated files in {reports_dir}:")
    print("  - baseline_results.md")
    print("  - logistic_regression_confusion_matrix.png")
    print("  - random_forest_confusion_matrix.png")
    print("  - feature_importance.png")
    
    print(f"\nESP32 files in {arduino_dir}:")
    print("  - fall_model.h")
    print("  - features.h")
    print("  - labels.h")


if __name__ == "__main__":
    main()
