from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
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
    ESP32_IP: str = "192.168.1.100"
    ESP32_PORT: int = 80
    
    # CORS Origins
    ALLOWED_ORIGINS: List[str] = ["http://localhost:8081"]
    
    # Alert Thresholds
    FALL_ALERT_ENABLED: bool = True
    SLEEP_QUALITY_THRESHOLD: int = 60
    ABNORMAL_STRUGGLE_THRESHOLD: int = 5
    
    @property
    def esp32_url(self) -> str:
        """Get the full ESP32 URL"""
        return f"http://{self.ESP32_IP}:{self.ESP32_PORT}"


settings = Settings()

