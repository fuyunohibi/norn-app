from fastapi import APIRouter
from app.api.v1 import sensor, mode, health

router = APIRouter()

router.include_router(sensor.router, prefix="/sensor", tags=["sensor"])
router.include_router(mode.router, prefix="/mode", tags=["mode"])
router.include_router(health.router, prefix="/health", tags=["health"])

