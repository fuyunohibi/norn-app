"""
Sleep Model Trainer - WHOOP Data Integration

This module provides functionality to:
1. Load and process WHOOP sleep data from CSV
2. Create synthetic sensor data from WHOOP metrics
3. Train sleep ML models
4. Evaluate model performance
"""

import csv
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from app.services.sleep_ml_service import sleep_ml_service

logger = logging.getLogger(__name__)


class SleepModelTrainer:
    """Utility class for training sleep analysis models from WHOOP data"""
    
    def __init__(self):
        self.ml_service = sleep_ml_service
    
    def load_whoop_data(self, csv_path: str) -> List[Dict]:
        """
        Load WHOOP sleep data from CSV file
        
        Args:
            csv_path: Path to WHOOP sleep CSV file
            
        Returns:
            List of sleep records as dictionaries
        """
        logger.info(f"📥 Loading WHOOP sleep data from {csv_path}...")
        
        records = []
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Skip empty rows
                    if not row.get('Sleep performance %'):
                        continue
                    
                    # Skip naps for main sleep training (can include later if needed)
                    is_nap = row.get('Nap', 'false').lower() == 'true'
                    
                    try:
                        record = {
                            'sleep_onset': row['Sleep onset'],
                            'wake_onset': row['Wake onset'],
                            'sleep_performance': float(row['Sleep performance %']) if row['Sleep performance %'] else 0,
                            'respiratory_rate': float(row['Respiratory rate (rpm)']) if row['Respiratory rate (rpm)'] else 0,
                            'asleep_duration': int(row['Asleep duration (min)']) if row['Asleep duration (min)'] else 0,
                            'in_bed_duration': int(row['In bed duration (min)']) if row['In bed duration (min)'] else 0,
                            'light_sleep_duration': int(row['Light sleep duration (min)']) if row['Light sleep duration (min)'] else 0,
                            'deep_sleep_duration': int(row['Deep (SWS) duration (min)']) if row['Deep (SWS) duration (min)'] else 0,
                            'rem_duration': int(row['REM duration (min)']) if row['REM duration (min)'] else 0,
                            'awake_duration': int(row['Awake duration (min)']) if row['Awake duration (min)'] else 0,
                            'sleep_need': int(row['Sleep need (min)']) if row['Sleep need (min)'] else 0,
                            'sleep_debt': int(row['Sleep debt (min)']) if row['Sleep debt (min)'] else 0,
                            'sleep_efficiency': float(row['Sleep efficiency %']) if row['Sleep efficiency %'] else 0,
                            'sleep_consistency': float(row['Sleep consistency %']) if row.get('Sleep consistency %') and row['Sleep consistency %'] else 0,
                            'is_nap': is_nap,
                        }
                        records.append(record)
                    except (ValueError, KeyError) as e:
                        logger.warning(f"⚠️  Skipping invalid row: {e}")
                        continue
            
            logger.info(f"✅ Loaded {len(records)} sleep records from WHOOP data")
            main_sleeps = [r for r in records if not r['is_nap']]
            naps = [r for r in records if r['is_nap']]
            logger.info(f"   Main sleep sessions: {len(main_sleeps)}")
            logger.info(f"   Naps: {len(naps)}")
            
            return records
            
        except Exception as e:
            logger.error(f"❌ Error loading WHOOP data: {e}")
            return []
    
    def synthesize_sensor_data_from_whoop(self, whoop_record: Dict) -> List[Dict]:
        """
        Synthesize sensor data points from WHOOP sleep record
        
        This creates realistic sensor readings that could produce the WHOOP metrics.
        We simulate the entire sleep session with data points.
        
        Args:
            whoop_record: Single WHOOP sleep record
            
        Returns:
            List of synthetic sensor data points
        """
        total_minutes = whoop_record['in_bed_duration']
        if total_minutes == 0:
            return []
        
        # Generate sensor readings (one per minute)
        sensor_data = []
        
        # Calculate stage durations
        deep_min = whoop_record['deep_sleep_duration']
        light_min = whoop_record['light_sleep_duration']
        rem_min = whoop_record['rem_duration']
        awake_min = whoop_record['awake_duration']
        
        # Create realistic stage progression
        stages = []
        
        # Start with light sleep or awake
        stages.extend([2] * min(10, awake_min))  # Awake at start
        awake_min -= min(10, awake_min)
        
        # Distribute sleep stages throughout the night
        # Typical pattern: Light -> Deep -> Light -> REM (cycles)
        num_cycles = max(1, int(total_minutes / 90))  # ~90 min cycles
        
        for cycle in range(num_cycles):
            # Light sleep at cycle start
            cycle_light = min(light_min, 20)
            stages.extend([1] * cycle_light)
            light_min -= cycle_light
            
            # Deep sleep (more in first half of night)
            if deep_min > 0:
                cycle_deep = min(deep_min, 30 if cycle < num_cycles / 2 else 10)
                stages.extend([0] * cycle_deep)
                deep_min -= cycle_deep
            
            # More light sleep
            cycle_light = min(light_min, 25)
            stages.extend([1] * cycle_light)
            light_min -= cycle_light
            
            # REM sleep (more in second half of night)
            if rem_min > 0:
                cycle_rem = min(rem_min, 10 if cycle < num_cycles / 2 else 25)
                # Note: WHOOP tracks REM separately, we'll encode it as light (1) but with different vitals
                stages.extend([1] * cycle_rem)
                rem_min -= cycle_rem
            
            # Brief awakenings
            if awake_min > 0:
                cycle_awake = min(awake_min, 3)
                stages.extend([2] * cycle_awake)
                awake_min -= cycle_awake
        
        # Fill remaining time
        while len(stages) < total_minutes:
            if light_min > 0:
                stages.append(1)
                light_min -= 1
            elif awake_min > 0:
                stages.append(2)
                awake_min -= 1
            else:
                stages.append(1)
        
        # Trim to exact duration
        stages = stages[:total_minutes]
        
        # Generate sensor readings for each minute
        base_hr = 55 + np.random.randint(-5, 5)  # Base heart rate during sleep
        base_rr = whoop_record['respiratory_rate']
        
        for minute, stage in enumerate(stages):
            # Adjust vitals based on sleep stage
            if stage == 0:  # Deep sleep
                hr = base_hr + np.random.randint(-5, 0)
                rr = base_rr + np.random.uniform(-1, 0)
                body_movement = np.random.randint(0, 2)
                large_moves = 0
                minor_moves = np.random.randint(0, 2)
            elif stage == 1:  # Light sleep
                hr = base_hr + np.random.randint(-2, 5)
                rr = base_rr + np.random.uniform(-0.5, 0.5)
                body_movement = np.random.randint(1, 5)
                large_moves = 0 if np.random.random() > 0.1 else 1
                minor_moves = np.random.randint(1, 3)
            else:  # Awake (2)
                hr = base_hr + np.random.randint(5, 15)
                rr = base_rr + np.random.uniform(0, 2)
                body_movement = np.random.randint(3, 10)
                large_moves = 1 if np.random.random() > 0.5 else 0
                minor_moves = np.random.randint(2, 5)
            
            # Add some variation
            hr += np.random.normal(0, 2)
            rr += np.random.normal(0, 0.3)
            
            # Simulate occasional apnea events (if poor sleep quality)
            apnea = 0
            if whoop_record['sleep_performance'] < 60 and np.random.random() < 0.02:
                apnea = 1
                rr -= 2  # Breathing drops during apnea
            
            sensor_data.append({
                'timestamp': minute * 60,  # Convert to seconds
                'presence': 1,
                'in_bed': 1,
                'sleep_status': stage,
                'heart_rate': max(40, int(hr)),
                'respiration_rate': max(8, int(rr)),
                'body_movement_range': int(body_movement),
                'human_movement': 0 if body_movement < 3 else (1 if body_movement < 7 else 2),
                'comprehensive': {
                    'large_body_move': large_moves,
                    'minor_body_move': minor_moves,
                    'turns': 1 if large_moves > 0 and np.random.random() > 0.7 else 0,
                    'apnea_events': apnea,
                }
            })
        
        return sensor_data
    
    def prepare_training_data_from_whoop(self, whoop_records: List[Dict]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Prepare training data from WHOOP records
        
        Args:
            whoop_records: List of WHOOP sleep records
            
        Returns:
            Tuple of (features, quality_labels, stage_labels)
        """
        logger.info(f"🔨 Preparing training data from {len(whoop_records)} WHOOP records...")
        
        features_list = []
        quality_labels = []
        stage_labels = []
        
        for idx, record in enumerate(whoop_records):
            # Skip naps for now (can be included later)
            if record['is_nap']:
                continue
            
            # Synthesize sensor data for this sleep session
            sensor_data_points = self.synthesize_sensor_data_from_whoop(record)
            
            if len(sensor_data_points) < 30:  # Need minimum data
                continue
            
            # Reset buffer for this sleep session
            self.ml_service.clear_buffer()
            
            # Process sensor data points and extract features
            for data_point in sensor_data_points:
                self.ml_service.add_data_point(data_point)
                
                # Extract features once we have enough data
                if len(self.ml_service.data_buffer) >= 10:
                    features = self.ml_service.extract_features()
                    if features is not None:
                        features_list.append(features[0])
                        quality_labels.append(record['sleep_performance'])
                        stage_labels.append(data_point['sleep_status'])
            
            if (idx + 1) % 10 == 0:
                logger.info(f"   Processed {idx + 1}/{len(whoop_records)} records...")
        
        if not features_list:
            logger.warning("⚠️  No valid training samples created!")
            return np.array([]), np.array([]), np.array([])
        
        X = np.array(features_list)
        y_quality = np.array(quality_labels)
        y_stage = np.array(stage_labels)
        
        logger.info(f"✅ Prepared {len(X)} training samples from WHOOP data")
        logger.info(f"   Quality score range: {y_quality.min():.1f} - {y_quality.max():.1f}")
        logger.info(f"   Stage distribution:")
        logger.info(f"     Deep sleep (0): {np.sum(y_stage == 0)}")
        logger.info(f"     Light sleep (1): {np.sum(y_stage == 1)}")
        logger.info(f"     Awake (2): {np.sum(y_stage == 2)}")
        
        return X, y_quality, y_stage
    
    def train_and_evaluate(self, X: np.ndarray, y_quality: np.ndarray, y_stage: np.ndarray, test_size: float = 0.2):
        """
        Train models and evaluate performance
        
        Args:
            X: Feature matrix
            y_quality: Quality scores
            y_stage: Stage labels
            test_size: Fraction of data to use for testing
        """
        if len(X) == 0:
            logger.error("❌ Cannot train: no training data available")
            return
        
        logger.info(f"🎓 Training and evaluating sleep models...")
        logger.info(f"   Total samples: {len(X)}")
        logger.info(f"   Features per sample: {X.shape[1]}")
        
        # Split data
        X_train, X_test, yq_train, yq_test, ys_train, ys_test = train_test_split(
            X, y_quality, y_stage, test_size=test_size, random_state=42
        )
        
        logger.info(f"   Training set: {len(X_train)} samples")
        logger.info(f"   Test set: {len(X_test)} samples")
        
        # Train models
        self.ml_service.train_models(X_train, yq_train, ys_train)
        
        # Evaluate on test set
        if len(X_test) > 0:
            logger.info("\n" + "=" * 80)
            logger.info("📊 SLEEP MODEL EVALUATION RESULTS")
            logger.info("=" * 80)
            
            X_test_scaled = self.ml_service.scaler.transform(X_test)
            
            # Evaluate quality model
            yq_pred = self.ml_service.quality_model.predict(X_test_scaled)
            mae = mean_absolute_error(yq_test, yq_pred)
            rmse = np.sqrt(mean_squared_error(yq_test, yq_pred))
            r2 = r2_score(yq_test, yq_pred)
            
            logger.info(f"\n🎯 Sleep Quality Prediction:")
            logger.info(f"   MAE:  {mae:.2f} (average error in quality score)")
            logger.info(f"   RMSE: {rmse:.2f}")
            logger.info(f"   R²:   {r2:.3f} (1.0 = perfect prediction)")
            
            # Evaluate stage model
            ys_pred = self.ml_service.stage_model.predict(X_test_scaled)
            stage_accuracy = np.mean(ys_pred == ys_test)
            
            logger.info(f"\n🌙 Sleep Stage Classification:")
            logger.info(f"   Accuracy: {stage_accuracy:.2%}")
            
            # Per-stage accuracy
            for stage, name in [(0, 'Deep'), (1, 'Light'), (2, 'Awake')]:
                mask = ys_test == stage
                if np.sum(mask) > 0:
                    stage_acc = np.mean(ys_pred[mask] == ys_test[mask])
                    logger.info(f"   {name} sleep accuracy: {stage_acc:.2%}")
            
            logger.info("=" * 80)
        
        logger.info("\n✅ Training and evaluation complete!")
    
    def train_from_whoop_csv(self, csv_path: str):
        """
        Complete training pipeline: load WHOOP data, prepare, train, evaluate
        
        Args:
            csv_path: Path to WHOOP CSV file
        """
        logger.info("🚀 Starting sleep model training from WHOOP data...")
        
        # Load WHOOP data
        whoop_records = self.load_whoop_data(csv_path)
        
        if not whoop_records:
            logger.error("❌ No WHOOP data available. Cannot train model.")
            return
        
        # Prepare training data
        X, y_quality, y_stage = self.prepare_training_data_from_whoop(whoop_records)
        
        if len(X) == 0:
            logger.error("❌ No valid training samples. Cannot train model.")
            return
        
        # Train and evaluate
        self.train_and_evaluate(X, y_quality, y_stage)
        
        logger.info("✅ Complete WHOOP training pipeline finished!")


# Create trainer instance
sleep_trainer = SleepModelTrainer()

