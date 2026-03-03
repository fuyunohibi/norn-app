from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/status")
async def health_status():
    """
    Get health status of backend
    """
    return {
        "backend": {
            "status": "healthy",
            "environment": settings.ENVIRONMENT
        },
        "supabase": {
            "status": "configured",
            "url": settings.SUPABASE_URL
        }
    }

