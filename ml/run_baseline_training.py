#!/usr/bin/env python3
"""
IMU Fall/Activity Detection - Baseline Training Script

This script runs the complete ML pipeline for training and evaluating
baseline models (Logistic Regression and Random Forest) on IMU sensor data.

Usage:
    python ml/run_baseline_training.py

    Or with custom parameters:
    python ml/run_baseline_training.py --data-dir backend/collected_data --output-dir reports

Author: Auto-generated for norn-app
"""

import os
import sys
import argparse
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.imu_fall_detection_pipeline import run_full_pipeline


def main():
    parser = argparse.ArgumentParser(
        description='Train and evaluate baseline models for IMU fall/activity detection'
    )
    
    # Get the project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Default paths
    default_data_dir = os.path.join(project_root, "backend", "collected_data")
    default_output_dir = os.path.join(project_root, "reports")
    
    parser.add_argument(
        '--data-dir',
        type=str,
        default=default_data_dir,
        help=f'Directory containing session CSV files (default: {default_data_dir})'
    )
    
    parser.add_argument(
        '--output-dir',
        type=str,
        default=default_output_dir,
        help=f'Directory for output reports and plots (default: {default_output_dir})'
    )
    
    parser.add_argument(
        '--window-size',
        type=float,
        default=1.0,
        help='Window size in seconds (default: 1.0)'
    )
    
    parser.add_argument(
        '--window-step',
        type=float,
        default=0.5,
        help='Window step/stride in seconds (default: 0.5)'
    )
    
    parser.add_argument(
        '--test-size',
        type=float,
        default=0.3,
        help='Fraction of sessions for test set (default: 0.3)'
    )
    
    parser.add_argument(
        '--random-state',
        type=int,
        default=42,
        help='Random seed for reproducibility (default: 42)'
    )
    
    args = parser.parse_args()
    
    # Validate data directory
    if not os.path.isdir(args.data_dir):
        print(f"Error: Data directory not found: {args.data_dir}")
        print("Please specify the correct path using --data-dir")
        sys.exit(1)
    
    # Check for CSV files
    csv_files = [f for f in os.listdir(args.data_dir) if f.startswith('session_') and f.endswith('.csv')]
    if not csv_files:
        print(f"Error: No session_*.csv files found in {args.data_dir}")
        sys.exit(1)
    
    print(f"\n{'#'*60}")
    print(f"# IMU Fall/Activity Detection - Baseline Training")
    print(f"# Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*60}")
    print(f"\nConfiguration:")
    print(f"  - Data directory: {args.data_dir}")
    print(f"  - Output directory: {args.output_dir}")
    print(f"  - Window size: {args.window_size}s")
    print(f"  - Window step: {args.window_step}s")
    print(f"  - Test size: {args.test_size}")
    print(f"  - Random state: {args.random_state}")
    print(f"  - CSV files found: {len(csv_files)}")
    
    # Run the pipeline
    try:
        results = run_full_pipeline(
            data_dir=args.data_dir,
            output_dir=args.output_dir,
            window_size_s=args.window_size,
            window_step_s=args.window_step,
            test_size=args.test_size,
            random_state=args.random_state
        )
        
        # Print summary
        print(f"\n{'#'*60}")
        print("# SUMMARY")
        print(f"{'#'*60}")
        print(f"\nModels trained successfully!")
        print(f"Number of training windows: {len(results['X_train'])}")
        print(f"Number of test windows: {len(results['X_test'])}")
        print(f"Number of features: {len(results['feature_names'])}")
        print(f"\nResults:")
        for r in results['results']:
            print(f"  - {r['model_name']}: {r['accuracy']:.4f} ({r['accuracy']*100:.2f}% accuracy)")
        
        print(f"\nOutputs saved to: {args.output_dir}/")
        print(f"  - baseline_results.md (detailed report)")
        print(f"  - logistic_regression_confusion_matrix.png")
        print(f"  - random_forest_confusion_matrix.png")
        print(f"  - feature_importance.png")
        
        print(f"\nFinished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"\nError during pipeline execution: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

