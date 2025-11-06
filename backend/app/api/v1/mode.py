from app.models.sensor import ModeChangeRequest, ModeChangeResponse
from app.services.esp32_service import esp32_service
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/change", response_model=ModeChangeResponse)
async def change_mode(request: ModeChangeRequest):
    """
    Change ESP32 sensor mode
    
    This endpoint is called by the mobile app when the user wants to switch
    between sleep detection and fall detection modes.
    
    Args:
        request: Mode change request with mode ("sleep" or "fall") and optional user_id
        
    Returns:
        Response from ESP32 confirming mode change
    """
    try:
        # Send command to ESP32
        esp32_response = await esp32_service.set_mode(request.mode)
        
        return ModeChangeResponse(
            status=esp32_response.get("status", "ok"),
            mode=esp32_response.get("mode", request.mode)
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to change mode on ESP32: {str(e)}"
        )


@router.get("/current")
async def get_current_mode():
    """
    Get current ESP32 mode (if available)
    
    Note: The ESP32 code doesn't currently expose a GET endpoint for mode status,
    so this is a placeholder for future implementation.
    """
    # This would need to be implemented on the ESP32 side
    return {
        "message": "Current mode endpoint not yet implemented on ESP32",
        "suggestion": "Mode state should be tracked in the backend or mobile app"
    }

