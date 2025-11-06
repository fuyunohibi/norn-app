"""
Model training utility for fall detection ML model

This module provides functionality to:
1. Fetch historical fall detection data from Supabase
2. Prepare training data with proper labels
3. Train and evaluate the ML model
4. Save the trained model for production use
"""

import logging
from typing import List, Tuple

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

from app.services.ml_service import ml_service
from app.services.supabase_service import supabase_service

logger = logging.getLogger(__name__)


class FallDetectionTrainer:
    """Utility class for training fall detection models"""
    
    def __init__(self):
        self.ml_service = ml_service
        self.supabase_service = supabase_service
    
    async def fetch_training_data(self, limit: int = 1000) -> List[dict]:
        """
        Fetch fall detection readings from Supabase
        
        Args:
            limit: Maximum number of readings to fetch
            
        Returns:
            List of sensor readings
        """
        logger.info(f"📥 Fetching up to {limit} fall detection readings from database...")
        
        try:
            # Fetch fall detection readings
            readings = await self.supabase_service.get_latest_readings(
                mode="fall_detection",
                user_id=None,  # Get all users
                limit=limit
            )
            
            logger.info(f"✅ Fetched {len(readings)} readings from database")
            return readings
            
        except Exception as e:
            logger.error(f"❌ Error fetching training data: {e}")
            return []
    
    def prepare_training_data(self, readings: List[dict], labeled_data: dict = None) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare training data from readings
        
        Args:
            readings: List of sensor readings from database
            labeled_data: Optional dict mapping reading IDs to labels (1=real fall, 0=false positive)
                         If None, uses rule-based heuristics for labeling
            
        Returns:
            Tuple of (features, labels)
        """
        logger.info(f"🔨 Preparing training data from {len(readings)} readings...")
        
        features_list = []
        labels_list = []
        
        # Sort all readings by timestamp
        sorted_readings = sorted(readings, key=lambda x: x.get('timestamp', ''))
        
        # Reset buffer
        self.ml_service.clear_buffer()
        
        # Process readings in chronological order
        for i, reading in enumerate(sorted_readings):
            raw_data = reading.get('raw_data', {})
            
            # Add to buffer
            self.ml_service.add_data_point(raw_data)
            
            # Only process if we have enough context
            if i < 3:
                continue
            
            # Extract features
            features = self.ml_service.extract_features()
            if features is None:
                continue
            
            # Determine label
            if labeled_data and reading.get('id') in labeled_data:
                label = labeled_data[reading['id']]
            else:
                # Use heuristic labeling
                label = self._heuristic_label(raw_data, reading)
            
            features_list.append(features[0])
            labels_list.append(label)
        
        if not features_list:
            logger.warning("⚠️  No valid training samples created!")
            return np.array([]), np.array([])
        
        X = np.array(features_list)
        y = np.array(labels_list)
        
        logger.info(f"✅ Prepared {len(X)} training samples")
        logger.info(f"   Positive samples (real falls): {np.sum(y == 1)}")
        logger.info(f"   Negative samples (false positives): {np.sum(y == 0)}")
        
        return X, y
    
    def _heuristic_label(self, raw_data: dict, reading: dict) -> int:
        """
        Apply heuristic rules to label data
        
        This is used when manual labels are not available.
        Real falls typically have:
        1. Sensor fall_status = 1
        2. High body_movement spike
        3. Prolonged stationary_dwell (>5 seconds)
        
        Args:
            raw_data: Raw sensor data
            reading: Full database reading
            
        Returns:
            1 for real fall, 0 for false positive
        """
        fall_status = raw_data.get('fall_status', 0)
        body_movement = raw_data.get('body_movement', 0)
        stationary_dwell = raw_data.get('stationary_dwell', 0)
        
        # If sensor didn't detect fall, it's definitely not a fall
        if fall_status == 0:
            return 0
        
        # Real falls have high movement + prolonged stationary time
        if body_movement >= 8 and stationary_dwell >= 5:
            return 1
        
        # Moderate movement + long stationary could be a fall
        if body_movement >= 5 and stationary_dwell >= 10:
            return 1
        
        # Otherwise, likely false positive (sitting down, adjusting, etc.)
        return 0
    
    def train_and_evaluate(self, X: np.ndarray, y: np.ndarray, test_size: float = 0.2):
        """
        Train model and evaluate performance
        
        Args:
            X: Feature matrix
            y: Labels
            test_size: Fraction of data to use for testing
        """
        if len(X) == 0:
            logger.error("❌ Cannot train: no training data available")
            return
        
        logger.info(f"🎓 Training and evaluating model...")
        logger.info(f"   Total samples: {len(X)}")
        logger.info(f"   Features per sample: {X.shape[1]}")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )
        
        logger.info(f"   Training set: {len(X_train)} samples")
        logger.info(f"   Test set: {len(X_test)} samples")
        
        # Train model
        self.ml_service.train_model(X_train, y_train)
        
        # Evaluate on test set
        if len(X_test) > 0:
            logger.info("\n" + "=" * 80)
            logger.info("📊 MODEL EVALUATION RESULTS")
            logger.info("=" * 80)
            
            # Make predictions
            X_test_scaled = self.ml_service.scaler.transform(X_test)
            y_pred = self.ml_service.model.predict(X_test_scaled)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, zero_division=0)
            recall = recall_score(y_test, y_pred, zero_division=0)
            f1 = f1_score(y_test, y_pred, zero_division=0)
            
            logger.info(f"\n📈 Performance Metrics:")
            logger.info(f"   Accuracy:  {accuracy:.2%}")
            logger.info(f"   Precision: {precision:.2%} (of detected falls, how many are real)")
            logger.info(f"   Recall:    {recall:.2%} (of real falls, how many detected)")
            logger.info(f"   F1 Score:  {f1:.2%}")
            
            # Confusion matrix
            cm = confusion_matrix(y_test, y_pred)
            logger.info(f"\n🔢 Confusion Matrix:")
            logger.info(f"                  Predicted")
            logger.info(f"                  Negative  Positive")
            logger.info(f"   Actual Negative    {cm[0][0]:4d}      {cm[0][1]:4d}")
            logger.info(f"          Positive    {cm[1][0]:4d}      {cm[1][1]:4d}")
            
            # Classification report
            logger.info(f"\n📋 Detailed Classification Report:")
            report = classification_report(y_test, y_pred, target_names=['False Positive', 'Real Fall'])
            logger.info(f"\n{report}")
            
            logger.info("=" * 80)
        
        logger.info("\n✅ Training and evaluation complete!")
    
    async def train_from_database(self, limit: int = 1000, labeled_data: dict = None):
        """
        Complete training pipeline: fetch data, prepare, train, evaluate
        
        Args:
            limit: Maximum readings to fetch
            labeled_data: Optional manual labels
        """
        logger.info("🚀 Starting complete model training pipeline...")
        
        # Fetch data
        readings = await self.fetch_training_data(limit)
        
        if not readings:
            logger.error("❌ No training data available. Cannot train model.")
            return
        
        # Prepare data
        X, y = self.prepare_training_data(readings, labeled_data)
        
        if len(X) == 0:
            logger.error("❌ No valid training samples. Cannot train model.")
            return
        
        # Train and evaluate
        self.train_and_evaluate(X, y)
        
        logger.info("✅ Complete training pipeline finished!")


# Create trainer instance
trainer = FallDetectionTrainer()

