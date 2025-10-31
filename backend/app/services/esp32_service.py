import httpx
from typing import Dict, Any
from app.core.config import settings


class ESP32Service:
    """Service for communicating with ESP32 device"""
    
    def __init__(self):
        self.base_url = settings.esp32_url
        self.timeout = 10.0
    
    async def set_mode(self, mode: str) -> Dict[str, Any]:
        """
        Send mode change command to ESP32
        
        Args:
            mode: Either "sleep" or "fall"
            
        Returns:
            Response from ESP32
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/set-mode",
                    params={"mode": mode}
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to communicate with ESP32: {str(e)}")
    
    async def check_connection(self) -> bool:
        """
        Check if ESP32 is reachable
        
        Returns:
            True if ESP32 is reachable, False otherwise
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/")
                return response.status_code == 200
        except:
            return False


esp32_service = ESP32Service()

