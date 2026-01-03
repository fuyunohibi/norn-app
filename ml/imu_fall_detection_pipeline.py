"""
IMU-based Fall/Activity Detection Pipeline

This module provides functions for:
- Loading IMU data from CSV files (session-based)
- Windowing time-series data
- Extracting features from IMU signals
- Training and evaluating ML models

Author: Auto-generated for norn-app
"""

import os
import re
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Optional
from collections import Counter

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score


# ============================================================================
# Data Loading
# ============================================================================

def load_all_sessions(data_dir: str, file_pattern: str = "session_*.csv") -> pd.DataFrame:
    """
    Load all session CSV files from the specified directory.
    
    Args:
        data_dir: Path to directory containing CSV files
        file_pattern: Glob pattern for matching session files (default: "session_*.csv")
    
    Returns:
        pd.DataFrame with columns:
            - session_id (int): Extracted from filename
            - timestamp_ms (int): Device timestamp in milliseconds
            - ax, ay, az (float): Acceleration components (m/s²)
            - gx, gy, gz (float): Gyro components (rad/s)
            - bkk_time (str): Bangkok timezone timestamp
            - label (str): Activity label
    """
    import glob
    
    csv_files = sorted(glob.glob(os.path.join(data_dir, file_pattern)))
    
    if not csv_files:
        raise FileNotFoundError(f"No CSV files matching '{file_pattern}' found in {data_dir}")
    
    all_dfs = []
    
    for csv_path in csv_files:
        filename = os.path.basename(csv_path)
        
        # Extract session ID from filename (e.g., "session_1.csv" -> 1)
        match = re.search(r'session_(\d+)\.csv', filename)
        if match:
            session_id = int(match.group(1))
        else:
            # Fallback: use hash of filename
            session_id = hash(filename) % 10000
        
        # Read CSV
        df = pd.read_csv(csv_path)
        df['session_id'] = session_id
        
        all_dfs.append(df)
    
    # Concatenate all sessions
    combined_df = pd.concat(all_dfs, ignore_index=True)
    
    # Ensure correct dtypes
    combined_df['timestamp_ms'] = pd.to_numeric(combined_df['timestamp_ms'], errors='coerce').astype('Int64')
    
    for col in ['ax', 'ay', 'az', 'gx', 'gy', 'gz']:
        combined_df[col] = pd.to_numeric(combined_df[col], errors='coerce').astype(float)
    
    combined_df['label'] = combined_df['label'].astype(str)
    combined_df['bkk_time'] = combined_df['bkk_time'].astype(str)
    
    # Clean labels: fix common typos and remove invalid labels
    # Valid labels: standing, sitting, walking, sit_to_stand, stand_to_sit, 
    #               falling, after_fall_on_floor, unstable_standing, getting_up_from_floor
    label_corrections = {
        'sittting': 'sitting',  # Fix typo
        'getting_up_from_fall': 'getting_up_from_floor',  # Fix incorrect label
    }
    combined_df['label'] = combined_df['label'].replace(label_corrections)
    
    # Remove rows with invalid labels (e.g., those containing 'timestamp_ms')
    invalid_mask = combined_df['label'].str.contains('timestamp_ms', na=False)
    if invalid_mask.any():
        print(f"Warning: Removing {invalid_mask.sum()} rows with invalid labels")
        combined_df = combined_df[~invalid_mask]
    
    # Drop rows with NaN in critical columns
    combined_df = combined_df.dropna(subset=['timestamp_ms', 'ax', 'ay', 'az', 'gx', 'gy', 'gz', 'label'])
    
    # Sort by session and timestamp
    combined_df = combined_df.sort_values(['session_id', 'timestamp_ms']).reset_index(drop=True)
    
    print(f"Loaded {len(csv_files)} sessions with {len(combined_df)} total samples")
    print(f"Sessions: {sorted(combined_df['session_id'].unique())}")
    print(f"Labels: {combined_df['label'].value_counts().to_dict()}")
    
    return combined_df


# ============================================================================
# Windowing
# ============================================================================

def get_majority_label(labels: pd.Series) -> Optional[str]:
    """
    Get the majority label from a series of labels.
    
    Args:
        labels: Series of label strings
        
    Returns:
        Most common label, or last label if there's a tie, or None if empty
    """
    if labels.empty:
        return None
    
    counter = Counter(labels)
    most_common = counter.most_common()
    
    if len(most_common) == 1:
        return most_common[0][0]
    
    # Check for tie
    if most_common[0][1] == most_common[1][1]:
        # Tie: return the last label in the window
        return labels.iloc[-1]
    
    return most_common[0][0]


def make_windows(
    df: pd.DataFrame,
    window_size_s: float = 1.0,
    window_step_s: float = 0.5,
    min_samples_per_window: int = 10
) -> pd.DataFrame:
    """
    Create sliding windows over the IMU data.
    
    Args:
        df: DataFrame with session_id, timestamp_ms, and sensor columns
        window_size_s: Window size in seconds (default: 1.0)
        window_step_s: Window step/stride in seconds (default: 0.5)
        min_samples_per_window: Minimum samples required in a window (default: 10)
        
    Returns:
        DataFrame with one row per window containing:
            - session_id
            - window_idx
            - window_start_ms
            - window_end_ms
            - label (majority label)
            - n_samples (number of samples in window)
            - raw_data (list of row indices for feature extraction)
    """
    windows = []
    
    for session_id in df['session_id'].unique():
        session_df = df[df['session_id'] == session_id].copy()
        
        if session_df.empty:
            continue
        
        # Calculate median sampling interval for this session
        timestamps = session_df['timestamp_ms'].values
        intervals = np.diff(timestamps)
        median_interval_ms = np.median(intervals) if len(intervals) > 0 else 20.0
        
        # Convert window parameters to milliseconds
        window_size_ms = window_size_s * 1000
        window_step_ms = window_step_s * 1000
        
        # Get time range
        t_min = timestamps.min()
        t_max = timestamps.max()
        
        # Create windows
        window_idx = 0
        t_start = t_min
        
        while t_start + window_size_ms <= t_max + median_interval_ms:
            t_end = t_start + window_size_ms
            
            # Get samples in this window
            mask = (session_df['timestamp_ms'] >= t_start) & (session_df['timestamp_ms'] < t_end)
            window_samples = session_df[mask]
            
            if len(window_samples) >= min_samples_per_window:
                label = get_majority_label(window_samples['label'])
                
                if label is not None:
                    windows.append({
                        'session_id': session_id,
                        'window_idx': window_idx,
                        'window_start_ms': t_start,
                        'window_end_ms': t_end,
                        'label': label,
                        'n_samples': len(window_samples),
                        'sample_indices': window_samples.index.tolist()
                    })
                    window_idx += 1
            
            t_start += window_step_ms
    
    windows_df = pd.DataFrame(windows)
    
    if windows_df.empty:
        raise ValueError("No valid windows created. Check data and window parameters.")
    
    print(f"Created {len(windows_df)} windows from {df['session_id'].nunique()} sessions")
    print(f"Window label distribution: {windows_df['label'].value_counts().to_dict()}")
    
    return windows_df


# ============================================================================
# Feature Extraction
# ============================================================================

def compute_window_features(samples: pd.DataFrame) -> Dict[str, float]:
    """
    Compute features for a single window of IMU data.
    
    Args:
        samples: DataFrame with ax, ay, az, gx, gy, gz columns
        
    Returns:
        Dictionary of feature_name -> feature_value
    """
    features = {}
    
    # Compute magnitudes
    a_mag = np.sqrt(samples['ax']**2 + samples['ay']**2 + samples['az']**2)
    w_mag = np.sqrt(samples['gx']**2 + samples['gy']**2 + samples['gz']**2)
    
    # Feature columns to process
    accel_cols = ['ax', 'ay', 'az']
    gyro_cols = ['gx', 'gy', 'gz']
    
    # Statistics to compute
    def compute_stats(series: pd.Series, prefix: str) -> Dict[str, float]:
        return {
            f'{prefix}_mean': series.mean(),
            f'{prefix}_std': series.std(),
            f'{prefix}_min': series.min(),
            f'{prefix}_max': series.max(),
        }
    
    # Acceleration features
    for col in accel_cols:
        features.update(compute_stats(samples[col], col))
    
    # Acceleration magnitude features
    features.update(compute_stats(a_mag, 'a_mag'))
    
    # Gyro features
    for col in gyro_cols:
        features.update(compute_stats(samples[col], col))
    
    # Gyro magnitude features
    features.update(compute_stats(w_mag, 'w_mag'))
    
    return features


def extract_features_for_windows(
    df: pd.DataFrame,
    windows_df: pd.DataFrame
) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray]:
    """
    Extract features for all windows.
    
    Args:
        df: Original DataFrame with all samples
        windows_df: DataFrame of windows (from make_windows)
        
    Returns:
        Tuple of:
            - features_df: DataFrame with window info + feature columns
            - X: numpy array of shape (n_windows, n_features)
            - y: numpy array of labels
    """
    all_features = []
    
    for idx, row in windows_df.iterrows():
        sample_indices = row['sample_indices']
        samples = df.loc[sample_indices]
        
        window_features = compute_window_features(samples)
        window_features['session_id'] = row['session_id']
        window_features['window_idx'] = row['window_idx']
        window_features['window_start_ms'] = row['window_start_ms']
        window_features['window_end_ms'] = row['window_end_ms']
        window_features['label'] = row['label']
        window_features['n_samples'] = row['n_samples']
        
        all_features.append(window_features)
    
    features_df = pd.DataFrame(all_features)
    
    # Get feature column names (exclude metadata columns)
    metadata_cols = ['session_id', 'window_idx', 'window_start_ms', 'window_end_ms', 'label', 'n_samples']
    feature_cols = [c for c in features_df.columns if c not in metadata_cols]
    
    X = features_df[feature_cols].values
    y = features_df['label'].values
    
    print(f"Extracted {len(feature_cols)} features for {len(features_df)} windows")
    print(f"Feature columns: {feature_cols}")
    
    return features_df, X, y


# ============================================================================
# Train/Test Split (by Session)
# ============================================================================

def train_test_split_by_session(
    features_df: pd.DataFrame,
    X: np.ndarray,
    y: np.ndarray,
    test_size: float = 0.3,
    random_state: int = 42
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[int], List[int]]:
    """
    Split data into train/test sets by session (not by row).
    
    This prevents data leakage from having windows from the same session
    in both train and test sets.
    
    Args:
        features_df: DataFrame with session_id and features
        X: Feature matrix
        y: Labels array
        test_size: Fraction of sessions for test (default: 0.3)
        random_state: Random seed for reproducibility
        
    Returns:
        Tuple of (X_train, X_test, y_train, y_test, sessions_train, sessions_test)
    """
    sessions = features_df['session_id'].unique()
    
    # Split sessions
    sessions_train, sessions_test = train_test_split(
        sessions, 
        test_size=test_size, 
        random_state=random_state
    )
    
    # Get indices for train/test
    train_mask = features_df['session_id'].isin(sessions_train)
    test_mask = features_df['session_id'].isin(sessions_test)
    
    X_train = X[train_mask]
    X_test = X[test_mask]
    y_train = y[train_mask]
    y_test = y[test_mask]
    
    print(f"Train sessions ({len(sessions_train)}): {sorted(sessions_train)}")
    print(f"Test sessions ({len(sessions_test)}): {sorted(sessions_test)}")
    print(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")
    print(f"Train label distribution: {dict(pd.Series(y_train).value_counts())}")
    print(f"Test label distribution: {dict(pd.Series(y_test).value_counts())}")
    
    return X_train, X_test, y_train, y_test, list(sessions_train), list(sessions_test)


# ============================================================================
# Model Training
# ============================================================================

def train_logistic_regression(
    X_train: np.ndarray,
    y_train: np.ndarray,
    max_iter: int = 1000,
    random_state: int = 42
) -> Tuple[LogisticRegression, StandardScaler]:
    """
    Train a Logistic Regression model with feature scaling.
    
    Args:
        X_train: Training features
        y_train: Training labels
        max_iter: Maximum iterations for solver
        random_state: Random seed
        
    Returns:
        Tuple of (trained model, fitted scaler)
    """
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    
    clf = LogisticRegression(
        max_iter=max_iter,
        solver='lbfgs',
        random_state=random_state,
        n_jobs=-1
    )
    clf.fit(X_train_scaled, y_train)
    
    return clf, scaler


def train_random_forest(
    X_train: np.ndarray,
    y_train: np.ndarray,
    n_estimators: int = 200,
    max_depth: Optional[int] = None,
    random_state: int = 42
) -> RandomForestClassifier:
    """
    Train a Random Forest classifier.
    
    Args:
        X_train: Training features
        y_train: Training labels
        n_estimators: Number of trees
        max_depth: Maximum tree depth (None for unlimited)
        random_state: Random seed
        
    Returns:
        Trained RandomForestClassifier
    """
    clf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=random_state,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    
    return clf


# ============================================================================
# Evaluation
# ============================================================================

def evaluate_model(
    model,
    X_test: np.ndarray,
    y_test: np.ndarray,
    model_name: str,
    scaler: Optional[StandardScaler] = None
) -> Dict:
    """
    Evaluate a trained model on test data.
    
    Args:
        model: Trained sklearn classifier
        X_test: Test features
        y_test: Test labels
        model_name: Name for display
        scaler: Optional scaler to transform X_test (for Logistic Regression)
        
    Returns:
        Dictionary with evaluation metrics
    """
    if scaler is not None:
        X_test_transformed = scaler.transform(X_test)
    else:
        X_test_transformed = X_test
    
    y_pred = model.predict(X_test_transformed)
    
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)
    report_str = classification_report(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    labels = sorted(set(y_test) | set(y_pred))
    
    print(f"\n{'='*60}")
    print(f"=== {model_name} ===")
    print(f"{'='*60}")
    print(f"\nOverall Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"\nClassification Report:")
    print(report_str)
    print(f"\nConfusion Matrix (labels: {labels}):")
    print(cm)
    
    return {
        'model_name': model_name,
        'accuracy': accuracy,
        'classification_report': report,
        'classification_report_str': report_str,
        'confusion_matrix': cm,
        'labels': labels,
        'y_pred': y_pred,
        'y_test': y_test
    }


def save_evaluation_report(
    results: List[Dict],
    output_path: str,
    train_sessions: List[int],
    test_sessions: List[int]
):
    """
    Save evaluation results to a Markdown file.
    
    Args:
        results: List of evaluation result dictionaries
        output_path: Path to output .md file
        train_sessions: List of training session IDs
        test_sessions: List of test session IDs
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Convert to native Python ints for clean display
    train_sessions_clean = [int(s) for s in sorted(train_sessions)]
    test_sessions_clean = [int(s) for s in sorted(test_sessions)]
    
    with open(output_path, 'w') as f:
        f.write("# IMU Fall/Activity Detection - Baseline Results\n\n")
        f.write(f"Generated by `imu_fall_detection_pipeline.py`\n\n")
        
        f.write("## Dataset Split\n\n")
        f.write(f"- **Train sessions** ({len(train_sessions_clean)}): {train_sessions_clean}\n")
        f.write(f"- **Test sessions** ({len(test_sessions_clean)}): {test_sessions_clean}\n\n")
        
        f.write("## Model Comparison Summary\n\n")
        f.write("| Model | Accuracy |\n")
        f.write("|-------|----------|\n")
        for r in results:
            f.write(f"| {r['model_name']} | {r['accuracy']:.4f} ({r['accuracy']*100:.2f}%) |\n")
        f.write("\n")
        
        for r in results:
            f.write(f"## {r['model_name']}\n\n")
            f.write(f"**Overall Accuracy:** {r['accuracy']:.4f} ({r['accuracy']*100:.2f}%)\n\n")
            f.write("### Classification Report\n\n")
            f.write("```\n")
            f.write(r['classification_report_str'])
            f.write("```\n\n")
            f.write("### Confusion Matrix\n\n")
            f.write(f"Labels: {r['labels']}\n\n")
            f.write("```\n")
            f.write(str(r['confusion_matrix']))
            f.write("\n```\n\n")
    
    print(f"\nReport saved to: {output_path}")


# ============================================================================
# Visualization (Optional)
# ============================================================================

def plot_confusion_matrices(
    results: List[Dict],
    output_dir: str
):
    """
    Plot and save confusion matrices for all models.
    
    Args:
        results: List of evaluation result dictionaries
        output_dir: Directory to save PNG files
    """
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns
    except ImportError:
        print("Warning: matplotlib/seaborn not available. Skipping confusion matrix plots.")
        return
    
    os.makedirs(output_dir, exist_ok=True)
    
    for r in results:
        model_name = r['model_name']
        cm = r['confusion_matrix']
        labels = r['labels']
        
        fig, ax = plt.subplots(figsize=(12, 10))
        sns.heatmap(
            cm, 
            annot=True, 
            fmt='d', 
            cmap='Blues',
            xticklabels=labels,
            yticklabels=labels,
            ax=ax
        )
        ax.set_xlabel('Predicted')
        ax.set_ylabel('Actual')
        ax.set_title(f'{model_name} - Confusion Matrix\nAccuracy: {r["accuracy"]:.4f}')
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        
        # Save
        safe_name = model_name.lower().replace(' ', '_')
        output_path = os.path.join(output_dir, f'{safe_name}_confusion_matrix.png')
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"Saved confusion matrix plot: {output_path}")


def plot_feature_importance(
    rf_model: RandomForestClassifier,
    feature_names: List[str],
    output_path: str,
    top_n: int = 20
):
    """
    Plot feature importance from Random Forest model.
    
    Args:
        rf_model: Trained RandomForestClassifier
        feature_names: List of feature names
        output_path: Path to save the plot
        top_n: Number of top features to show
    """
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print("Warning: matplotlib not available. Skipping feature importance plot.")
        return
    
    importances = rf_model.feature_importances_
    indices = np.argsort(importances)[::-1][:top_n]
    
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.barh(range(len(indices)), importances[indices], align='center')
    ax.set_yticks(range(len(indices)))
    ax.set_yticklabels([feature_names[i] for i in indices])
    ax.invert_yaxis()
    ax.set_xlabel('Feature Importance')
    ax.set_title(f'Top {top_n} Feature Importances (Random Forest)')
    plt.tight_layout()
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Saved feature importance plot: {output_path}")


# ============================================================================
# Main Pipeline Function
# ============================================================================

def run_full_pipeline(
    data_dir: str,
    output_dir: str = "reports",
    window_size_s: float = 1.0,
    window_step_s: float = 0.5,
    test_size: float = 0.3,
    random_state: int = 42
) -> Dict:
    """
    Run the complete ML pipeline: load data, extract features, train, evaluate.
    
    Args:
        data_dir: Path to directory containing session CSV files
        output_dir: Directory to save reports and plots
        window_size_s: Window size in seconds
        window_step_s: Window step in seconds
        test_size: Fraction of sessions for testing
        random_state: Random seed for reproducibility
        
    Returns:
        Dictionary containing models, results, and metadata
    """
    print("="*60)
    print("IMU Fall/Activity Detection Pipeline")
    print("="*60)
    
    # Step 1: Load data
    print("\n[1/6] Loading data...")
    df = load_all_sessions(data_dir)
    
    # Step 2: Create windows
    print("\n[2/6] Creating windows...")
    windows_df = make_windows(df, window_size_s=window_size_s, window_step_s=window_step_s)
    
    # Step 3: Extract features
    print("\n[3/6] Extracting features...")
    features_df, X, y = extract_features_for_windows(df, windows_df)
    
    # Get feature names for later use
    metadata_cols = ['session_id', 'window_idx', 'window_start_ms', 'window_end_ms', 'label', 'n_samples']
    feature_names = [c for c in features_df.columns if c not in metadata_cols]
    
    # Step 4: Train/test split
    print("\n[4/6] Splitting train/test by session...")
    X_train, X_test, y_train, y_test, sessions_train, sessions_test = train_test_split_by_session(
        features_df, X, y, test_size=test_size, random_state=random_state
    )
    
    # Step 5: Train models
    print("\n[5/6] Training models...")
    
    print("\nTraining Logistic Regression...")
    lr_model, lr_scaler = train_logistic_regression(X_train, y_train, random_state=random_state)
    
    print("Training Random Forest...")
    rf_model = train_random_forest(X_train, y_train, random_state=random_state)
    
    # Step 6: Evaluate
    print("\n[6/6] Evaluating models...")
    
    lr_results = evaluate_model(lr_model, X_test, y_test, "Logistic Regression", scaler=lr_scaler)
    rf_results = evaluate_model(rf_model, X_test, y_test, "Random Forest")
    
    all_results = [lr_results, rf_results]
    
    # Save report
    report_path = os.path.join(output_dir, "baseline_results.md")
    save_evaluation_report(all_results, report_path, sessions_train, sessions_test)
    
    # Plot confusion matrices
    plot_confusion_matrices(all_results, output_dir)
    
    # Plot feature importance
    plot_feature_importance(
        rf_model, 
        feature_names, 
        os.path.join(output_dir, "feature_importance.png")
    )
    
    print("\n" + "="*60)
    print("Pipeline complete!")
    print("="*60)
    
    return {
        'df': df,
        'features_df': features_df,
        'X': X,
        'y': y,
        'feature_names': feature_names,
        'X_train': X_train,
        'X_test': X_test,
        'y_train': y_train,
        'y_test': y_test,
        'sessions_train': sessions_train,
        'sessions_test': sessions_test,
        'models': {
            'logistic_regression': (lr_model, lr_scaler),
            'random_forest': rf_model
        },
        'results': all_results
    }


if __name__ == "__main__":
    # Default paths (adjust if needed)
    DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "collected_data")
    OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")
    
    run_full_pipeline(DATA_DIR, OUTPUT_DIR)

