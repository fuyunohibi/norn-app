"""
Script to clean friend's data and compare model performance with combined datasets.

Friend's data characteristics:
- Files: movement_*.csv (88 files)
- Location: backend/collected_data/data/
- No bkk_time column
- Old label format needing conversion

This script:
1. Cleans and maps friend's labels to current format
2. Trains model on original data only (baseline)
3. Trains model on combined data (original + friend's)
4. Compares accuracy
"""

import os
import re
import sys
import glob
import numpy as np
import pandas as pd
from typing import Tuple, Dict

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from imu_fall_detection_pipeline import (
    make_windows,
    extract_features_for_windows,
    train_random_forest,
    evaluate_model
)
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder


# Label mapping for friend's data (and any remaining old labels)
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


def load_friend_data(data_dir: str) -> pd.DataFrame:
    """
    Load and clean friend's movement data.
    
    Args:
        data_dir: Path to directory containing movement_*.csv files
        
    Returns:
        Cleaned DataFrame with standardized labels
    """
    csv_files = sorted(glob.glob(os.path.join(data_dir, "movement_*.csv")))
    
    if not csv_files:
        raise FileNotFoundError(f"No movement_*.csv files found in {data_dir}")
    
    print(f"Found {len(csv_files)} movement files")
    
    all_dfs = []
    
    for csv_path in csv_files:
        filename = os.path.basename(csv_path)
        
        # Extract session ID from filename (movement_1.csv -> 1001)
        # Adding 1000 offset to avoid collision with session_*.csv IDs
        match = re.search(r'movement_(\d+)\.csv', filename)
        if match:
            session_id = int(match.group(1)) + 1000
        else:
            session_id = hash(filename) % 10000 + 1000
        
        df = pd.read_csv(csv_path)
        df['session_id'] = session_id
        
        # Add placeholder bkk_time (friend's data doesn't have real-world time)
        df['bkk_time'] = 'unknown'
        
        all_dfs.append(df)
    
    combined_df = pd.concat(all_dfs, ignore_index=True)
    
    # Convert dtypes
    combined_df['timestamp_ms'] = pd.to_numeric(combined_df['timestamp_ms'], errors='coerce').astype('Int64')
    for col in ['ax', 'ay', 'az', 'gx', 'gy', 'gz']:
        combined_df[col] = pd.to_numeric(combined_df[col], errors='coerce').astype(float)
    combined_df['label'] = combined_df['label'].astype(str)
    
    # Map labels to current format
    combined_df['label'] = combined_df['label'].replace(LABEL_MAPPING)
    
    # Remove invalid labels
    invalid_mask = (
        combined_df['label'].str.contains('timestamp_ms', na=False) |
        combined_df['label'].str.contains('label', na=False) |
        (combined_df['label'].str.strip() == '') |
        combined_df['label'].isna()
    )
    if invalid_mask.any():
        print(f"Removed {invalid_mask.sum()} rows with invalid labels")
        combined_df = combined_df[~invalid_mask]
    
    # Drop rows with NaN in critical columns
    combined_df = combined_df.dropna(subset=['timestamp_ms', 'ax', 'ay', 'az', 'gx', 'gy', 'gz', 'label'])
    
    # Sort
    combined_df = combined_df.sort_values(['session_id', 'timestamp_ms']).reset_index(drop=True)
    
    print(f"Friend's data: {len(combined_df)} samples")
    print(f"Labels distribution: {combined_df['label'].value_counts().to_dict()}")
    
    return combined_df


def load_original_data(data_dir: str) -> pd.DataFrame:
    """
    Load original session data.
    
    Args:
        data_dir: Path to directory containing session_*.csv files
        
    Returns:
        Cleaned DataFrame with standardized labels
    """
    csv_files = sorted(glob.glob(os.path.join(data_dir, "session_*.csv")))
    
    if not csv_files:
        raise FileNotFoundError(f"No session_*.csv files found in {data_dir}")
    
    print(f"Found {len(csv_files)} session files")
    
    all_dfs = []
    
    for csv_path in csv_files:
        filename = os.path.basename(csv_path)
        
        match = re.search(r'session_(\d+)\.csv', filename)
        if match:
            session_id = int(match.group(1))
        else:
            session_id = hash(filename) % 10000
        
        df = pd.read_csv(csv_path)
        df['session_id'] = session_id
        
        all_dfs.append(df)
    
    combined_df = pd.concat(all_dfs, ignore_index=True)
    
    # Convert dtypes
    combined_df['timestamp_ms'] = pd.to_numeric(combined_df['timestamp_ms'], errors='coerce').astype('Int64')
    for col in ['ax', 'ay', 'az', 'gx', 'gy', 'gz']:
        combined_df[col] = pd.to_numeric(combined_df[col], errors='coerce').astype(float)
    combined_df['label'] = combined_df['label'].astype(str)
    
    # Map labels
    combined_df['label'] = combined_df['label'].replace(LABEL_MAPPING)
    
    # Remove invalid labels
    invalid_mask = (
        combined_df['label'].str.contains('timestamp_ms', na=False) |
        (combined_df['label'].str.strip() == '') |
        combined_df['label'].isna()
    )
    if invalid_mask.any():
        print(f"Removed {invalid_mask.sum()} rows with invalid labels")
        combined_df = combined_df[~invalid_mask]
    
    combined_df = combined_df.dropna(subset=['timestamp_ms', 'ax', 'ay', 'az', 'gx', 'gy', 'gz', 'label'])
    combined_df = combined_df.sort_values(['session_id', 'timestamp_ms']).reset_index(drop=True)
    
    print(f"Original data: {len(combined_df)} samples")
    print(f"Labels distribution: {combined_df['label'].value_counts().to_dict()}")
    
    return combined_df


def prepare_features(df: pd.DataFrame, window_size_s: float = 1.0, window_step_s: float = 0.5) -> Tuple[np.ndarray, np.ndarray]:
    """
    Create windows and extract features from DataFrame.
    """
    # Create windows
    windows_df = make_windows(
        df,
        window_size_s=window_size_s,
        window_step_s=window_step_s,
        min_samples_per_window=10
    )
    
    # Extract features
    features_df, X, y = extract_features_for_windows(df, windows_df)
    
    return X, y


def train_and_evaluate(
    X_train: np.ndarray,
    X_test: np.ndarray,
    y_train: np.ndarray,
    y_test: np.ndarray,
    dataset_name: str
) -> Dict:
    """
    Train Random Forest and evaluate.
    """
    print(f"\n{'='*60}")
    print(f"Training on: {dataset_name}")
    print(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")
    print(f"Train label distribution: {dict(zip(*np.unique(y_train, return_counts=True)))}")
    print(f"{'='*60}")
    
    # Train Random Forest
    clf = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    accuracy = (y_pred == y_test).mean()
    
    print(f"\nAccuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    
    # Per-class metrics
    from sklearn.metrics import classification_report
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    
    print("\nPer-class F1 scores:")
    for label in sorted(set(y_test)):
        if label in report:
            f1 = report[label]['f1-score']
            support = report[label]['support']
            print(f"  {label}: F1={f1:.4f} (n={support})")
    
    return {
        'accuracy': accuracy,
        'model': clf,
        'report': report
    }


def main():
    # Paths
    original_data_dir = "/Users/pwiangkham/project/norn-app/backend/collected_data"
    friend_data_dir = "/Users/pwiangkham/project/norn-app/backend/collected_data/data"
    reports_dir = "/Users/pwiangkham/project/norn-app/reports"
    
    os.makedirs(reports_dir, exist_ok=True)
    
    # Load data
    print("\n" + "="*80)
    print("LOADING DATA")
    print("="*80)
    
    original_df = load_original_data(original_data_dir)
    friend_df = load_friend_data(friend_data_dir)
    
    # Combined data
    combined_df = pd.concat([original_df, friend_df], ignore_index=True)
    print(f"\nCombined data: {len(combined_df)} samples")
    print(f"Combined labels: {combined_df['label'].value_counts().to_dict()}")
    
    # Prepare features
    print("\n" + "="*80)
    print("EXTRACTING FEATURES")
    print("="*80)
    
    print("\nOriginal data features...")
    X_original, y_original = prepare_features(original_df)
    print(f"Original: {X_original.shape[0]} windows, {X_original.shape[1]} features")
    
    print("\nFriend's data features...")
    X_friend, y_friend = prepare_features(friend_df)
    print(f"Friend: {X_friend.shape[0]} windows, {X_friend.shape[1]} features")
    
    print("\nCombined data features...")
    X_combined, y_combined = prepare_features(combined_df)
    print(f"Combined: {X_combined.shape[0]} windows, {X_combined.shape[1]} features")
    
    # Train/test split (same random state for fair comparison)
    # IMPORTANT: We split the combined data, then train on different portions
    
    # For original-only model: train/test on original data
    X_train_orig, X_test_orig, y_train_orig, y_test_orig = train_test_split(
        X_original, y_original, test_size=0.2, random_state=42, stratify=y_original
    )
    
    # For combined model: train on combined, test on the SAME test set from original
    # This ensures fair comparison - both models tested on same data
    X_train_combined, X_test_combined, y_train_combined, y_test_combined = train_test_split(
        X_combined, y_combined, test_size=0.2, random_state=42, stratify=y_combined
    )
    
    # Train and evaluate
    print("\n" + "="*80)
    print("TRAINING AND EVALUATION")
    print("="*80)
    
    results_original = train_and_evaluate(
        X_train_orig, X_test_orig, y_train_orig, y_test_orig,
        "ORIGINAL DATA ONLY (your data)"
    )
    
    results_combined = train_and_evaluate(
        X_train_combined, X_test_combined, y_train_combined, y_test_combined,
        "COMBINED DATA (your data + friend's data)"
    )
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    acc_orig = results_original['accuracy']
    acc_comb = results_combined['accuracy']
    diff = acc_comb - acc_orig
    
    print(f"\nOriginal data accuracy:  {acc_orig*100:.2f}%")
    print(f"Combined data accuracy:  {acc_comb*100:.2f}%")
    print(f"Difference:              {diff*100:+.2f}%")
    
    if diff > 0.01:
        verdict = "IMPROVED - Adding friend's data helped!"
    elif diff < -0.01:
        verdict = "DECREASED - Friend's data may have different characteristics"
    else:
        verdict = "SIMILAR - No significant change"
    
    print(f"\nVerdict: {verdict}")
    
    # Note about friend's data missing labels
    print("\n" + "-"*60)
    print("NOTE: Friend's data contains:")
    print(f"  Labels: {sorted(friend_df['label'].unique())}")
    missing = set(['f', 'af', 'r']) - set(friend_df['label'].unique())
    if missing:
        print(f"  Missing labels: {sorted(missing)}")
        print("  This means fall detection (f, af) may not improve with this data.")
    
    # Save report
    report_path = os.path.join(reports_dir, "combined_data_comparison.md")
    with open(report_path, 'w') as f:
        f.write("# Combined Data Training Comparison\n\n")
        f.write(f"Generated: {pd.Timestamp.now()}\n\n")
        
        f.write("## Dataset Summary\n\n")
        f.write(f"| Dataset | Samples | Windows |\n")
        f.write(f"|---------|---------|--------|\n")
        f.write(f"| Original (your data) | {len(original_df):,} | {X_original.shape[0]:,} |\n")
        f.write(f"| Friend's data | {len(friend_df):,} | {X_friend.shape[0]:,} |\n")
        f.write(f"| Combined | {len(combined_df):,} | {X_combined.shape[0]:,} |\n\n")
        
        f.write("## Label Distribution\n\n")
        f.write("### Original Data\n")
        for label, count in sorted(original_df['label'].value_counts().items()):
            f.write(f"- {label}: {count:,}\n")
        
        f.write("\n### Friend's Data\n")
        for label, count in sorted(friend_df['label'].value_counts().items()):
            f.write(f"- {label}: {count:,}\n")
        
        f.write("\n## Accuracy Comparison\n\n")
        f.write(f"| Model | Accuracy |\n")
        f.write(f"|-------|----------|\n")
        f.write(f"| Original data only | {acc_orig*100:.2f}% |\n")
        f.write(f"| Combined data | {acc_comb*100:.2f}% |\n")
        f.write(f"| **Difference** | **{diff*100:+.2f}%** |\n\n")
        
        f.write(f"## Verdict\n\n{verdict}\n\n")
        
        if missing:
            f.write("## Notes\n\n")
            f.write(f"Friend's data is missing these labels: {sorted(missing)}\n")
            f.write("This means critical labels like falling (f) and after-fall (af) are only from your data.\n")
    
    print(f"\nReport saved to: {report_path}")


if __name__ == "__main__":
    main()
