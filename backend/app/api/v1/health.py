from fastapi import APIRouter
from app.services.esp32_service import esp32_service
from app.core.config import settings

router = APIRouter()


@router.get("/status")
async def health_status():
    """
    Get health status of backend and ESP32 connection
    """
    esp32_connected = await esp32_service.check_connection()
    
    return {
        "backend": {
            "status": "healthy",
            "environment": settings.ENVIRONMENT
        },
        "esp32": {
            "status": "connected" if esp32_connected else "disconnected",
            "url": settings.esp32_url
        },
        "supabase": {
            "status": "configured",
            "url": settings.SUPABASE_URL
        }
    }

