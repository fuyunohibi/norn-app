import json
from typing import List, Optional

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    
    # ESP32 Configuration
    ESP32_IP: str = "10.0.1.70"  # Default IP, can be overridden in .env.local
    ESP32_PORT: int = 80  # HTTP server port on ESP32
    
    # CORS Origins - stored as string to avoid JSON parsing issues with Pydantic Settings
    ALLOWED_ORIGINS_STR: Optional[str] = None
    
    @computed_field
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Parse ALLOWED_ORIGINS_STR from string to list"""
        if self.ALLOWED_ORIGINS_STR is None or self.ALLOWED_ORIGINS_STR == "":
            return ["http://localhost:8081"]
        
        try:
            parsed = json.loads(self.ALLOWED_ORIGINS_STR)
            if isinstance(parsed, list):
                return parsed
            return [parsed] if parsed else ["http://localhost:8081"]
        except (json.JSONDecodeError, TypeError):
            # If it's not valid JSON, try splitting by comma
            origins = [origin.strip() for origin in self.ALLOWED_ORIGINS_STR.split(",") if origin.strip()]
            return origins if origins else ["http://localhost:8081"]
    
    # Alert Thresholds
    FALL_ALERT_ENABLED: bool = True
    SLEEP_QUALITY_THRESHOLD: int = 60
    ABNORMAL_STRUGGLE_THRESHOLD: int = 5
    
    @property
    def esp32_url(self) -> str:
        """Get the full ESP32 URL"""
        return f"http://{self.ESP32_IP}:{self.ESP32_PORT}"


settings = Settings()

