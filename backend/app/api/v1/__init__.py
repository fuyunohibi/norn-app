from fastapi import APIRouter
from app.api.v1 import alerts, health, sensor

router = APIRouter()

router.include_router(sensor.router, prefix="/sensor", tags=["sensor"])
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])

