"""
Script to train sleep ML model from WHOOP data

This script loads WHOOP sleep data and trains the sleep quality and stage models.
Run this script to create/update the sleep ML models before using them in production.

Usage:
    python train_sleep_model.py
"""

import logging
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.sleep_model_trainer import sleep_trainer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('sleep_training.log')
    ]
)

logger = logging.getLogger(__name__)


def main():
    """Main training function"""
    logger.info("=" * 80)
    logger.info("🌙 SLEEP MODEL TRAINING FROM WHOOP DATA")
    logger.info("=" * 80)
    
    # Path to WHOOP CSV data
    csv_path = "sleeps.csv"
    
    if not Path(csv_path).exists():
        logger.error(f"❌ WHOOP data file not found: {csv_path}")
        logger.error("Please ensure 'sleeps.csv' is in the backend directory")
        return 1
    
    try:
        # Train the model
        sleep_trainer.train_from_whoop_csv(csv_path)
        
        logger.info("\n" + "=" * 80)
        logger.info("✅ TRAINING COMPLETE!")
        logger.info("=" * 80)
        logger.info("\nThe trained models are now ready to use for sleep analysis.")
        logger.info("Models saved to: models/")
        logger.info("  - sleep_quality_model.pkl")
        logger.info("  - sleep_stage_model.pkl")
        logger.info("  - sleep_quality_model_scaler.pkl")
        
        return 0
        
    except Exception as e:
        logger.error(f"❌ Training failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())

