#!/usr/bin/env python3
"""
Script to train the fall detection ML model using data from Supabase
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.model_trainer import trainer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)


async def main():
    """Main training function"""
    logger.info("=" * 80)
    logger.info("🚀 STARTING MODEL TRAINING")
    logger.info("=" * 80)
    
    try:
        # Train with up to 1000 readings (adjust as needed)
        limit = 1000
        logger.info(f"📊 Training with up to {limit} readings from database...")
        
        await trainer.train_from_database(limit=limit, labeled_data=None)
        
        logger.info("=" * 80)
        logger.info("✅ MODEL TRAINING COMPLETE!")
        logger.info("=" * 80)
        logger.info("📁 New models saved to: backend/models/")
        logger.info("   - fall_detection_model.pkl")
        logger.info("   - fall_detection_scaler.pkl")
        
    except Exception as e:
        logger.error(f"❌ Error during training: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

