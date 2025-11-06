import logging
import pickle
from collections import deque
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

# Set up logger
logger = logging.getLogger(__name__)


class FallDetectionML:
    """
    Machine Learning service for fall detection validation
    
    This service validates sensor fall alerts by analyzing time-series patterns
    to distinguish real falls from false positives.
    """
    
    def __init__(self, model_path: Optional[str] = None, window_size: int = 10):
        """
        Initialize the ML service
        
        Args:
            model_path: Path to saved model. If None, uses default location.
            window_size: Number of recent data points to analyze (default: 10)
        """
        self.window_size = window_size
        self.model_path = model_path or "models/fall_detection_model.pkl"
        self.scaler_path = model_path.replace(".pkl", "_scaler.pkl") if model_path else "models/fall_detection_scaler.pkl"
        
        # Time-series buffer for feature engineering (single device)
        self.data_buffer: deque = deque(maxlen=window_size)
        
        # Load or create model
        self.model: Optional[RandomForestClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self._load_or_create_model()
    
    def _load_or_create_model(self):
        """Load existing model or create a new one"""
        model_file = Path(self.model_path)
        scaler_file = Path(self.scaler_path)
        
        if model_file.exists() and scaler_file.exists():
            try:
                with open(model_file, 'rb') as f:
                    self.model = pickle.load(f)
                with open(scaler_file, 'rb') as f:
                    self.scaler = pickle.load(f)
                logger.info(f"✅ Loaded existing fall detection model from {self.model_path}")
            except Exception as e:
                logger.warning(f"⚠️  Failed to load model: {e}. Creating new model.")
                self._create_default_model()
        else:
            logger.info("📦 No existing model found. Creating default model.")
            self._create_default_model()
    
    def _create_default_model(self):
        """Create a new default model"""
        # Create model with sensible defaults
        # In production, this should be trained on real data
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced'  # Handle imbalanced data
        )
        self.scaler = StandardScaler()
        logger.info("✅ Created new RandomForest model for fall detection")
    
    def add_data_point(self, data: Dict):
        """
        Add a data point to the time-series buffer
        
        Args:
            data: Sensor reading data
        """
        self.data_buffer.append({
            'timestamp': data.get('timestamp', datetime.now().timestamp()),
            'presence': data.get('presence', 0),
            'motion': data.get('motion', 0),
            'body_movement': data.get('body_movement', 0),
            'fall_status': data.get('fall_status', 0),
            'stationary_dwell': data.get('stationary_dwell', 0)
        })
    
    def extract_features(self) -> Optional[np.ndarray]:
        """
        Extract ML features from time-series buffer
        
        Features include:
        - Current sensor readings
        - Statistical features (mean, std, max, min)
        - Temporal features (velocity, acceleration)
        - Pattern indicators
        
        Returns:
            Feature array or None if insufficient data
        """
        buffer = list(self.data_buffer)
        
        if len(buffer) < 3:  # Need at least 3 points for meaningful features
            logger.warning(f"⚠️  Insufficient data points: {len(buffer)}")
            return None
        
        # Extract arrays for each metric
        presence = np.array([d['presence'] for d in buffer])
        motion = np.array([d['motion'] for d in buffer])
        body_movement = np.array([d['body_movement'] for d in buffer])
        fall_status = np.array([d['fall_status'] for d in buffer])
        stationary_dwell = np.array([d['stationary_dwell'] for d in buffer])
        
        features = []
        
        # 1. Current values (last reading)
        features.extend([
            presence[-1],
            motion[-1],
            body_movement[-1],
            fall_status[-1],
            stationary_dwell[-1]
        ])
        
        # 2. Body movement statistics (most important for fall detection)
        features.extend([
            np.mean(body_movement),
            np.std(body_movement),
            np.max(body_movement),
            np.min(body_movement),
            body_movement[-1] - body_movement[0],  # Change over window
        ])
        
        # 3. Motion transition features
        motion_changes = np.diff(motion)
        features.extend([
            np.sum(motion_changes != 0),  # Number of motion state changes
            np.sum(motion_changes > 0),   # Transitions to moving
            np.sum(motion_changes < 0),   # Transitions to stationary
        ])
        
        # 4. Velocity and acceleration (body_movement change rate)
        if len(body_movement) >= 2:
            velocity = np.diff(body_movement)
            features.extend([
                np.mean(velocity),
                np.max(velocity),
                np.min(velocity),
                np.std(velocity)
            ])
            
            if len(velocity) >= 2:
                acceleration = np.diff(velocity)
                features.extend([
                    np.mean(acceleration),
                    np.max(acceleration),
                    np.min(acceleration)
                ])
            else:
                features.extend([0, 0, 0])
        else:
            features.extend([0, 0, 0, 0, 0, 0, 0])
        
        # 5. Stationary dwell pattern (critical for real falls)
        features.extend([
            stationary_dwell[-1],
            np.mean(stationary_dwell),
            np.max(stationary_dwell),
            stationary_dwell[-1] - stationary_dwell[0],  # Dwell time increase
        ])
        
        # 6. Pattern indicators
        # Spike pattern: high body_movement followed by low
        recent_movement = body_movement[-3:] if len(body_movement) >= 3 else body_movement
        has_spike = np.max(recent_movement) > 2 * np.mean(body_movement) if len(body_movement) > 3 else 0
        features.append(int(has_spike))
        
        # Prolonged stationary after movement
        prolonged_stationary = (motion[-1] == 0 and stationary_dwell[-1] > 3)
        features.append(int(prolonged_stationary))
        
        # Fall detection consistency (sensor reported fall in multiple readings)
        fall_consistency = np.sum(fall_status > 0) / len(fall_status)
        features.append(fall_consistency)
        
        return np.array(features).reshape(1, -1)
    
    def predict_fall(self, data: Dict) -> Tuple[bool, float, Dict]:
        """
        Predict if a fall alert is genuine
        
        Args:
            data: Current sensor reading
            
        Returns:
            Tuple of (is_real_fall, confidence, analysis_dict)
        """
        # Add current data point to buffer
        self.add_data_point(data)
        
        # Extract features
        features = self.extract_features()
        
        if features is None:
            logger.warning(f"⚠️  Cannot make prediction: insufficient data")
            # Fall back to sensor reading if no ML prediction possible
            return data.get('fall_status', 0) > 0, 0.5, {
                'reason': 'insufficient_data',
                'buffer_size': len(self.data_buffer)
            }
        
        # Rule-based validation for common false positives
        analysis = self._analyze_fall_pattern(data)
        
        # If model is not trained, use rule-based approach
        if not hasattr(self.model, 'classes_'):
            logger.warning("⚠️  Model not trained yet. Using rule-based detection.")
            return self._rule_based_prediction(analysis)
        
        # Scale features
        try:
            features_scaled = self.scaler.transform(features)
        except Exception as e:
            logger.warning(f"⚠️  Scaler not fitted: {e}. Using unscaled features.")
            features_scaled = features
        
        # Make prediction
        try:
            prediction = self.model.predict(features_scaled)[0]
            probabilities = self.model.predict_proba(features_scaled)[0]
            confidence = float(probabilities[prediction])
            
            is_real_fall = bool(prediction == 1)
            
            logger.info(f"🤖 ML Prediction: {'REAL FALL' if is_real_fall else 'FALSE POSITIVE'} "
                       f"(confidence: {confidence:.2%})")
            
            return is_real_fall, confidence, analysis
            
        except Exception as e:
            logger.error(f"❌ Error during prediction: {e}")
            # Fallback to rule-based
            return self._rule_based_prediction(analysis)
    
    def _analyze_fall_pattern(self, data: Dict) -> Dict:
        """
        Analyze fall pattern for rule-based validation
        
        Returns detailed analysis of the fall event
        """
        buffer = list(self.data_buffer)
        
        if len(buffer) < 3:
            return {'pattern': 'insufficient_data'}
        
        body_movement = np.array([d['body_movement'] for d in buffer])
        motion = np.array([d['motion'] for d in buffer])
        stationary_dwell = np.array([d['stationary_dwell'] for d in buffer])
        
        analysis = {
            'pattern': 'unknown',
            'body_movement_spike': False,
            'rapid_to_stationary': False,
            'prolonged_stillness': False,
            'movement_max': int(np.max(body_movement)),
            'movement_variance': float(np.var(body_movement)),
            'current_dwell_time': int(stationary_dwell[-1]),
            'motion_state': int(motion[-1])
        }
        
        # Check for body movement spike
        recent_max = np.max(body_movement[-3:])
        avg_movement = np.mean(body_movement[:-3]) if len(body_movement) > 3 else 0
        analysis['body_movement_spike'] = recent_max > (avg_movement + 5) or recent_max > 10
        
        # Check for rapid transition to stationary
        if len(motion) >= 3:
            recent_motion = motion[-3:]
            analysis['rapid_to_stationary'] = (recent_motion[0] > 0 and recent_motion[-1] == 0)
        
        # Check for prolonged stillness (key indicator of real fall)
        analysis['prolonged_stillness'] = stationary_dwell[-1] >= 5
        
        # Classify pattern
        if analysis['body_movement_spike'] and analysis['prolonged_stillness']:
            analysis['pattern'] = 'real_fall_likely'
        elif analysis['body_movement_spike'] and not analysis['prolonged_stillness']:
            analysis['pattern'] = 'intentional_sitting'
        elif not analysis['body_movement_spike'] and data.get('fall_status', 0) > 0:
            analysis['pattern'] = 'sensor_false_positive'
        else:
            analysis['pattern'] = 'normal_activity'
        
        return analysis
    
    def _rule_based_prediction(self, analysis: Dict) -> Tuple[bool, float, Dict]:
        """
        Rule-based fall detection fallback
        
        Used when ML model is not available or not trained
        """
        pattern = analysis.get('pattern', 'unknown')
        
        if pattern == 'real_fall_likely':
            return True, 0.85, analysis
        elif pattern == 'sensor_false_positive':
            return False, 0.75, analysis
        elif pattern == 'intentional_sitting':
            return False, 0.70, analysis
        elif pattern == 'insufficient_data':
            return True, 0.50, analysis  # Conservative: report fall if uncertain
        else:
            return False, 0.60, analysis
    
    def train_model(self, X: np.ndarray, y: np.ndarray):
        """
        Train the fall detection model
        
        Args:
            X: Feature matrix (n_samples, n_features)
            y: Labels (n_samples,) where 1 = real fall, 0 = false positive
        """
        logger.info(f"🎓 Training fall detection model with {len(X)} samples...")
        
        # Fit scaler
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        
        # Train model
        self.model.fit(X_scaled, y)
        
        # Report training metrics
        train_accuracy = self.model.score(X_scaled, y)
        logger.info(f"✅ Model training complete. Training accuracy: {train_accuracy:.2%}")
        
        # Save model
        self.save_model()
    
    def save_model(self):
        """Save model and scaler to disk"""
        try:
            model_dir = Path(self.model_path).parent
            model_dir.mkdir(parents=True, exist_ok=True)
            
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.model, f)
            with open(self.scaler_path, 'wb') as f:
                pickle.dump(self.scaler, f)
            
            logger.info(f"💾 Model saved to {self.model_path}")
        except Exception as e:
            logger.error(f"❌ Error saving model: {e}")
    
    def clear_buffer(self):
        """Clear time-series buffer"""
        self.data_buffer.clear()
        logger.info(f"🧹 Cleared data buffer")


# Initialize ML service
logger.info("🚀 Initializing Fall Detection ML Service...")
ml_service = FallDetectionML(window_size=10)
logger.info("✅ ML Service initialized successfully")

