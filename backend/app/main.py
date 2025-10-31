from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1 import router as api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for FastAPI application"""
    # Startup
    print(f"🚀 Starting Norn Backend API - Environment: {settings.ENVIRONMENT}")
    print(f"📡 ESP32 expected at: http://{settings.ESP32_IP}:{settings.ESP32_PORT}")
    yield
    # Shutdown
    print("👋 Shutting down Norn Backend API")


app = FastAPI(
    title="Norn Health Monitoring API",
    description="Backend API for ESP32 sensor data and mobile app integration",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Norn Health Monitoring API",
        "version": "1.0.0",
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}

