import logging
from typing import Any, Dict, Optional

from app.core.config import settings
from supabase import Client, create_client

logger = logging.getLogger(__name__)


class SupabaseService:
    """Service for interacting with Supabase database (alerts only)."""

    def __init__(self):
        try:
            if not settings.SUPABASE_SERVICE_KEY:
                logger.error("❌ SUPABASE_SERVICE_KEY is not set!")
                raise ValueError("SUPABASE_SERVICE_KEY is required")

            if not settings.SUPABASE_SERVICE_KEY.startswith("eyJ"):
                logger.warning(
                    "⚠️  SUPABASE_SERVICE_KEY might not be a valid service_role key (should be a JWT token starting with 'eyJ')"
                )
                logger.warning(f"   Current key starts with: {settings.SUPABASE_SERVICE_KEY[:10]}...")
            else:
                logger.info("✅ Service role key format looks correct (JWT token)")

            logger.info("🔌 Initializing Supabase client...")
            self.client: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY,
            )
            logger.info("✅ Supabase client initialized successfully")
            logger.info(f"   URL: {settings.SUPABASE_URL}")
            logger.info(f"   Key type: service_role (first 20 chars: {settings.SUPABASE_SERVICE_KEY[:20]}...)")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {str(e)}")
            logger.error("   Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file")
            raise

    async def create_alert(self, alert_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create a new alert in the database.
        
        Args:
            alert_data: Dictionary containing:
                - user_id: User ID to associate with alert
                - alert_type: Type of alert (fall, fall_risk, etc.)
                - severity: Alert severity (critical, high, medium, low)
                - title: Alert title
                - message: Alert message
                - alert_data: Additional data dictionary
        
        Returns:
            Created alert record or None if failed
        """
        try:
            result = self.client.table("alerts").insert({
                "user_id": alert_data.get("user_id"),
                "alert_type": alert_data.get("alert_type"),
                "severity": alert_data.get("severity", "high"),
                "title": alert_data.get("title"),
                "message": alert_data.get("message"),
                "alert_data": alert_data.get("alert_data", {})
            }).execute()
            
            logger.info(f"✅ Alert created: {alert_data.get('alert_type')} for user {alert_data.get('user_id')}")
            return result.data[0] if result.data else None

        except Exception as e:
            logger.error(f"❌ Error creating alert: {str(e)}")
            return None


# Initialize service on module import
# This will fail fast if there's a configuration issue
try:
    supabase_service = SupabaseService()
except Exception as e:
    logger.error(f"❌ CRITICAL: Failed to initialize Supabase service: {str(e)}")
    logger.error("   The server will start but database operations will fail.")
    logger.error("   Please check your .env file and restart the server.")
    # Create a dummy service to prevent import errors
    supabase_service = None

