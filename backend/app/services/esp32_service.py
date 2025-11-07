import logging
from typing import Any, Dict, Optional

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class ESP32Service:
    """Service for communicating with ESP32 device"""
    
    def __init__(self):
        self.base_url = settings.esp32_url
        self._ip = settings.ESP32_IP
        self.timeout = 10.0
        logger.info(f"ESP32 Service initialized")
        logger.info(f"  Base URL: {self.base_url}")
        logger.info(f"  ESP32 IP: {settings.ESP32_IP}")
        logger.info(f"  ESP32 Port: {settings.ESP32_PORT}")
    
    def update_base_url(self, ip: str, port: Optional[int] = None) -> None:
        """Update the base URL when the device IP changes dynamically."""
        normalized_ip = (ip or "").strip()
        if not normalized_ip:
            return

        if port is None:
            port = settings.ESP32_PORT

        if normalized_ip == self._ip and self.base_url.endswith(f":{port}"):
            return

        new_url = f"http://{normalized_ip}:{port}"
        logger.info(f"🔄 Updating ESP32 endpoint: {self.base_url} -> {new_url}")
        self._ip = normalized_ip
        self.base_url = new_url

    async def set_mode(self, mode: str) -> Dict[str, Any]:
        """
        Send mode change command to ESP32
        
        Args:
            mode: Either "sleep" or "fall"
            
        Returns:
            Response from ESP32
        """
        url = f"{self.base_url}/set-mode"
        logger.info(f"Attempting to change ESP32 mode to: {mode}")
        logger.info(f"  URL: {url}")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.debug(f"Sending GET request to {url} with mode={mode}")
                response = await client.get(
                    url,
                    params={"mode": mode}
                )
                logger.info(f"ESP32 responded with status: {response.status_code}")
                response.raise_for_status()
                result = response.json()
                logger.info(f"✓ Mode changed successfully: {result}")
                return result
        except httpx.ConnectError as e:
            error_msg = f"Cannot connect to ESP32 at {self.base_url}"
            logger.error(f"❌ {error_msg}")
            logger.error(f"   Check:")
            logger.error(f"   1. ESP32 is powered on and connected to Wi-Fi")
            logger.error(f"   2. ESP32 IP is correct: {settings.ESP32_IP}")
            logger.error(f"   3. Backend and ESP32 are on the same network")
            logger.error(f"   4. Try: curl http://{settings.ESP32_IP}/set-mode?mode={mode}")
            raise Exception(f"{error_msg}: {str(e)}")
        except httpx.TimeoutException as e:
            error_msg = f"ESP32 request timed out after {self.timeout}s"
            logger.error(f"❌ {error_msg}")
            logger.error(f"   ESP32 might be unresponsive or network is slow")
            raise Exception(f"{error_msg}: {str(e)}")
        except httpx.HTTPStatusError as e:
            error_msg = f"ESP32 returned error status {e.response.status_code}"
            logger.error(f"❌ {error_msg}")
            logger.error(f"   Response: {e.response.text}")
            raise Exception(f"{error_msg}: {str(e)}")
        except httpx.HTTPError as e:
            error_msg = f"HTTP error communicating with ESP32"
            logger.error(f"❌ {error_msg}: {str(e)}")
            raise Exception(f"{error_msg}: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Unexpected error: {str(e)}")
            raise
    
    async def check_connection(self) -> bool:
        """
        Check if ESP32 is reachable
        
        Returns:
            True if ESP32 is reachable, False otherwise
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/")
                is_connected = response.status_code == 200
                if is_connected:
                    logger.info(f"✓ ESP32 is reachable at {self.base_url}")
                else:
                    logger.warning(f"⚠️  ESP32 responded with status {response.status_code}")
                return is_connected
        except Exception as e:
            logger.warning(f"⚠️  ESP32 connection check failed: {str(e)}")
            return False


esp32_service = ESP32Service()

