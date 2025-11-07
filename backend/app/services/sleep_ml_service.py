"""
Sleep Analysis ML Service

This service provides machine learning capabilities for sleep monitoring:
1. Sleep quality prediction
2. Sleep stage classification
3. Sleep pattern analysis
4. Integration with WHOOP training data
"""

import logging
import pickle
import warnings
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler

# Suppress sklearn version mismatch warnings
warnings.filterwarnings('ignore', message='.*Trying to unpickle.*', module='sklearn')
warnings.filterwarnings('ignore', message='.*InconsistentVersionWarning.*', module='sklearn')

logger = logging.getLogger(__name__)


def convert_numpy_types(obj: Any) -> Any:
    """Recursively convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj


class SleepAnalysisML:
    """
    Machine Learning service for sleep analysis and quality prediction
    
    This service uses WHOOP sleep data for training and provides:
    - Sleep quality prediction
    - Sleep efficiency estimation
    - Sleep pattern analysis
    - Real-time sleep stage detection
    """
    
    def __init__(self, model_path: Optional[str] = None, window_size: int = 30):
        """
        Initialize the sleep ML service
        
        Args:
            model_path: Path to saved model. If None, uses default location.
            window_size: Number of recent data points to analyze (default: 30 = ~30 seconds)
        """
        self.window_size = window_size
        self.model_path = model_path or "models/sleep_quality_model.pkl"
        self.stage_model_path = model_path or "models/sleep_stage_model.pkl"
        self.scaler_path = self.model_path.replace(".pkl", "_scaler.pkl")
        
        # Time-series buffer for feature engineering
        self.data_buffer: deque = deque(maxlen=window_size)
        
        # Models
        self.quality_model: Optional[RandomForestRegressor] = None  # Predicts sleep quality score
        self.stage_model: Optional[RandomForestClassifier] = None    # Predicts sleep stage
        self.scaler: Optional[StandardScaler] = None
        
        # Load or create models
        self._load_or_create_models()
    
    def _load_or_create_models(self):
        """Load existing models or create new ones"""
        quality_file = Path(self.model_path)
        stage_file = Path(self.stage_model_path)
        scaler_file = Path(self.scaler_path)
        
        if quality_file.exists() and stage_file.exists() and scaler_file.exists():
            try:
                with warnings.catch_warnings():
                    warnings.filterwarnings('ignore', message='.*Trying to unpickle.*', module='sklearn')
                    warnings.filterwarnings('ignore', message='.*InconsistentVersionWarning.*', module='sklearn')
                    with open(quality_file, 'rb') as f:
                        self.quality_model = pickle.load(f)
                    with open(stage_file, 'rb') as f:
                        self.stage_model = pickle.load(f)
                    with open(scaler_file, 'rb') as f:
                        self.scaler = pickle.load(f)
                logger.info(f"✅ Loaded existing sleep analysis models from {self.model_path}")
            except Exception as e:
                logger.warning(f"⚠️  Failed to load models: {e}. Creating new models.")
                self._create_default_models()
        else:
            logger.info("📦 No existing sleep models found. Creating default models.")
            self._create_default_models()
    
    def _create_default_models(self):
        """Create new default models"""
        # Quality prediction model (regression)
        self.quality_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        # Sleep stage classification model
        self.stage_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced'
        )
        
        self.scaler = StandardScaler()
        logger.info("✅ Created new RandomForest models for sleep analysis")
    
    def add_data_point(self, data: Dict):
        """
        Add a sensor data point to the time-series buffer
        
        Args:
            data: Sensor reading data from sleep detection mode
        """
        self.data_buffer.append({
            'timestamp': data.get('timestamp', datetime.now().timestamp()),
            'presence': data.get('presence', 0),
            'in_bed': data.get('in_bed', 0),
            'sleep_status': data.get('sleep_status', 3),  # 0=deep, 1=light, 2=awake, 3=none
            'heart_rate': data.get('heart_rate', 0),
            'respiration_rate': data.get('respiration_rate', 0),
            'body_movement_range': data.get('body_movement_range', 0),
            'human_movement': data.get('human_movement', 0),
            'large_body_move': data.get('comprehensive', {}).get('large_body_move', 0) if data.get('comprehensive') else 0,
            'minor_body_move': data.get('comprehensive', {}).get('minor_body_move', 0) if data.get('comprehensive') else 0,
            'turns': data.get('comprehensive', {}).get('turns', 0) if data.get('comprehensive') else 0,
            'apnea_events': data.get('comprehensive', {}).get('apnea_events', 0) if data.get('comprehensive') else 0,
        })
    
    def extract_features(self) -> Optional[np.ndarray]:
        """
        Extract ML features from time-series sleep data
        
        Features include:
        - Vital signs (heart rate, respiration rate)
        - Movement patterns
        - Sleep stage stability
        - Statistical features over the time window
        
        Returns:
            Feature array or None if insufficient data
        """
        buffer = list(self.data_buffer)
        
        if len(buffer) < 5:  # Need at least 5 points for meaningful features
            logger.warning(f"⚠️  Insufficient sleep data points: {len(buffer)}")
            return None
        
        # Extract arrays for each metric
        heart_rate = np.array([d['heart_rate'] for d in buffer])
        respiration_rate = np.array([d['respiration_rate'] for d in buffer])
        body_movement = np.array([d['body_movement_range'] for d in buffer])
        human_movement = np.array([d['human_movement'] for d in buffer])
        sleep_status = np.array([d['sleep_status'] for d in buffer])
        large_moves = np.array([d['large_body_move'] for d in buffer])
        minor_moves = np.array([d['minor_body_move'] for d in buffer])
        turns = np.array([d['turns'] for d in buffer])
        apnea = np.array([d['apnea_events'] for d in buffer])
        in_bed = np.array([d['in_bed'] for d in buffer])
        
        features = []
        
        # 1. Current vital signs (most recent reading)
        features.extend([
            heart_rate[-1],
            respiration_rate[-1],
        ])
        
        # 2. Heart rate variability features
        hr_valid = heart_rate[heart_rate > 0]  # Filter out zero readings
        if len(hr_valid) > 0:
            features.extend([
                np.mean(hr_valid),
                np.std(hr_valid),
                np.max(hr_valid),
                np.min(hr_valid),
                np.max(hr_valid) - np.min(hr_valid),  # HR range
            ])
        else:
            features.extend([0, 0, 0, 0, 0])
        
        # 3. Respiration features
        resp_valid = respiration_rate[respiration_rate > 0]
        if len(resp_valid) > 0:
            features.extend([
                np.mean(resp_valid),
                np.std(resp_valid),
                np.max(resp_valid),
                np.min(resp_valid),
            ])
        else:
            features.extend([0, 0, 0, 0])
        
        # 4. Movement features
        features.extend([
            np.mean(body_movement),
            np.std(body_movement),
            np.max(body_movement),
            np.sum(large_moves),      # Total large movements
            np.sum(minor_moves),      # Total minor movements
            np.sum(turns),            # Total turns
            np.mean(human_movement),  # Average movement intensity
        ])
        
        # 5. Sleep quality indicators
        features.extend([
            np.sum(apnea),            # Total apnea events
            np.sum(in_bed),           # Time in bed (count)
            len(buffer),              # Buffer size (time window)
        ])
        
        # 6. Sleep stage stability
        # Count transitions between sleep stages
        if len(sleep_status) > 1:
            stage_changes = np.sum(np.diff(sleep_status) != 0)
            features.append(stage_changes)
            
            # Current sleep stage one-hot encoding (0=deep, 1=light, 2=awake, 3=none)
            current_stage = sleep_status[-1]
            for stage in range(4):
                features.append(1 if current_stage == stage else 0)
        else:
            features.extend([0, 0, 0, 0, 0])
        
        # 7. Movement velocity (rate of change)
        if len(body_movement) >= 2:
            movement_velocity = np.diff(body_movement)
            features.extend([
                np.mean(np.abs(movement_velocity)),
                np.max(np.abs(movement_velocity)),
            ])
        else:
            features.extend([0, 0])
        
        # 8. Vital signs stability
        if len(hr_valid) >= 2:
            hr_changes = np.diff(hr_valid)
            features.append(np.std(hr_changes))
        else:
            features.append(0)
        
        if len(resp_valid) >= 2:
            resp_changes = np.diff(resp_valid)
            features.append(np.std(resp_changes))
        else:
            features.append(0)
        
        return np.array(features).reshape(1, -1)
    
    def predict_sleep_quality(self, data: Dict) -> Tuple[float, Dict]:
        """
        Predict sleep quality and analyze sleep patterns
        
        Args:
            data: Current sensor reading
            
        Returns:
            Tuple of (quality_score, analysis_dict)
        """
        # Add current data point to buffer
        self.add_data_point(data)
        
        # Extract features
        features = self.extract_features()
        
        if features is None:
            logger.warning(f"⚠️  Cannot make sleep prediction: insufficient data")
            return 50.0, {
                'reason': 'insufficient_data',
                'buffer_size': len(self.data_buffer)
            }
        
        # Analyze sleep pattern
        analysis = self._analyze_sleep_pattern(data)
        
        # If model is not trained, use rule-based approach
        if not hasattr(self.quality_model, 'n_features_in_'):
            logger.warning("⚠️  Sleep quality model not trained yet. Using rule-based estimation.")
            return self._rule_based_quality(analysis)
        
        # Scale features
        try:
            features_scaled = self.scaler.transform(features)
        except Exception as e:
            logger.warning(f"⚠️  Scaler not fitted: {e}. Using unscaled features.")
            features_scaled = features
        
        # Make predictions
        try:
            # Predict quality score (0-100)
            quality_score = self.quality_model.predict(features_scaled)[0]
            quality_score = np.clip(quality_score, 0, 100)  # Ensure valid range
            
            # Predict sleep stage if stage model is trained
            if hasattr(self.stage_model, 'classes_'):
                predicted_stage = self.stage_model.predict(features_scaled)[0]
                stage_probs = self.stage_model.predict_proba(features_scaled)[0]
                analysis['predicted_stage'] = int(predicted_stage)
                analysis['stage_probabilities'] = {
                    'deep': float(stage_probs[0]) if len(stage_probs) > 0 else 0,
                    'light': float(stage_probs[1]) if len(stage_probs) > 1 else 0,
                    'awake': float(stage_probs[2]) if len(stage_probs) > 2 else 0,
                    'none': float(stage_probs[3]) if len(stage_probs) > 3 else 0,
                }
            
            logger.info(f"🌙 Sleep Quality Prediction: {quality_score:.1f}%")
            
            # Convert numpy types
            analysis = convert_numpy_types(analysis)
            
            return float(quality_score), analysis
            
        except Exception as e:
            logger.error(f"❌ Error during sleep prediction: {e}")
            return self._rule_based_quality(analysis)
    
    def _analyze_sleep_pattern(self, data: Dict) -> Dict:
        """
        Analyze sleep pattern for detailed insights
        
        Returns detailed analysis of the sleep session
        """
        buffer = list(self.data_buffer)
        
        if len(buffer) < 3:
            return {'pattern': 'insufficient_data'}
        
        heart_rate = np.array([d['heart_rate'] for d in buffer if d['heart_rate'] > 0])
        respiration_rate = np.array([d['respiration_rate'] for d in buffer if d['respiration_rate'] > 0])
        body_movement = np.array([d['body_movement_range'] for d in buffer])
        sleep_status = np.array([d['sleep_status'] for d in buffer])
        apnea_events = sum([d['apnea_events'] for d in buffer])
        
        analysis = {
            'pattern': 'analyzing',
            'current_stage': int(sleep_status[-1]) if len(sleep_status) > 0 else 3,
            'avg_heart_rate': float(np.mean(heart_rate)) if len(heart_rate) > 0 else 0,
            'avg_respiration': float(np.mean(respiration_rate)) if len(respiration_rate) > 0 else 0,
            'movement_level': float(np.mean(body_movement)),
            'total_apnea_events': apnea_events,
            'restlessness_score': 0,
        }
        
        # Calculate restlessness score (higher = more restless)
        if len(body_movement) > 0:
            movement_changes = np.sum(np.diff(body_movement) != 0) if len(body_movement) > 1 else 0
            analysis['restlessness_score'] = float(movement_changes / len(body_movement) * 100)
        
        # Determine sleep quality pattern
        if apnea_events > 5:
            analysis['pattern'] = 'sleep_apnea_concern'
        elif analysis['restlessness_score'] > 30:
            analysis['pattern'] = 'restless_sleep'
        elif analysis['current_stage'] == 0:  # Deep sleep
            analysis['pattern'] = 'deep_sleep'
        elif analysis['current_stage'] == 1:  # Light sleep
            analysis['pattern'] = 'light_sleep'
        elif analysis['current_stage'] == 2:  # Awake
            analysis['pattern'] = 'awake'
        else:
            analysis['pattern'] = 'normal_sleep'
        
        return convert_numpy_types(analysis)
    
    def _rule_based_quality(self, analysis: Dict) -> Tuple[float, Dict]:
        """
        Rule-based sleep quality estimation
        
        Used when ML model is not available or not trained
        """
        base_score = 70.0
        
        # Adjust based on pattern
        pattern = analysis.get('pattern', 'normal_sleep')
        if pattern == 'deep_sleep':
            base_score = 85.0
        elif pattern == 'light_sleep':
            base_score = 70.0
        elif pattern == 'restless_sleep':
            base_score = 50.0
        elif pattern == 'sleep_apnea_concern':
            base_score = 40.0
        elif pattern == 'awake':
            base_score = 30.0
        
        # Adjust for restlessness
        restlessness = analysis.get('restlessness_score', 0)
        base_score -= min(restlessness * 0.3, 20)
        
        # Adjust for apnea events
        apnea = analysis.get('total_apnea_events', 0)
        base_score -= min(apnea * 5, 25)
        
        base_score = max(0, min(100, base_score))
        
        analysis = convert_numpy_types(analysis)
        return float(base_score), analysis
    
    def train_models(self, X: np.ndarray, y_quality: np.ndarray, y_stage: Optional[np.ndarray] = None):
        """
        Train the sleep analysis models
        
        Args:
            X: Feature matrix (n_samples, n_features)
            y_quality: Sleep quality scores (n_samples,) - values 0-100
            y_stage: Optional sleep stage labels (n_samples,) - 0=deep, 1=light, 2=awake, 3=none
        """
        logger.info(f"🎓 Training sleep analysis models with {len(X)} samples...")
        
        # Fit scaler
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        
        # Train quality model
        self.quality_model.fit(X_scaled, y_quality)
        quality_score = self.quality_model.score(X_scaled, y_quality)
        logger.info(f"✅ Quality model training complete. R² score: {quality_score:.3f}")
        
        # Train stage model if labels provided
        if y_stage is not None:
            self.stage_model.fit(X_scaled, y_stage)
            stage_accuracy = self.stage_model.score(X_scaled, y_stage)
            logger.info(f"✅ Stage model training complete. Accuracy: {stage_accuracy:.2%}")
        
        # Save models
        self.save_models()
    
    def save_models(self):
        """Save models and scaler to disk"""
        try:
            model_dir = Path(self.model_path).parent
            model_dir.mkdir(parents=True, exist_ok=True)
            
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.quality_model, f)
            with open(self.stage_model_path, 'wb') as f:
                pickle.dump(self.stage_model, f)
            with open(self.scaler_path, 'wb') as f:
                pickle.dump(self.scaler, f)
            
            logger.info(f"💾 Sleep models saved to {self.model_path}")
        except Exception as e:
            logger.error(f"❌ Error saving models: {e}")
    
    def clear_buffer(self):
        """Clear time-series buffer"""
        self.data_buffer.clear()
        logger.info(f"🧹 Cleared sleep data buffer")


# Initialize sleep ML service
logger.info("🚀 Initializing Sleep Analysis ML Service...")
sleep_ml_service = SleepAnalysisML(window_size=30)
logger.info("✅ Sleep ML Service initialized successfully")

