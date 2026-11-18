from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.forecast import ForecastRequest
from app.services.forecast_service import ForecastService
from app.schemas.common import APIResponse

router = APIRouter()


class ForecastRequestWithName(ForecastRequest):
    scenario_name: Optional[str] = None


@router.post("/predict", response_model=APIResponse)
async def predict(payload: ForecastRequestWithName, current_user: User = Depends(get_current_user)):
    result = await ForecastService.generate_forecast(payload, str(current_user.id), payload.scenario_name)
    return APIResponse(success=True, message="Forecast generated", data=result)


@router.get("/", response_model=APIResponse)
async def list_forecasts(current_user: User = Depends(get_current_user)):
    data = await ForecastService.list_forecasts(str(current_user.id), current_user.role)
    return APIResponse(success=True, data=data)


@router.get("/{forecast_id}/comparison", response_model=APIResponse)
async def get_forecast_comparison(forecast_id: str, current_user: User = Depends(get_current_user)):
    data = await ForecastService.get_forecast_comparison(forecast_id, str(current_user.id))
    return APIResponse(success=True, data=data)


@router.get("/{forecast_id}", response_model=APIResponse)
async def get_forecast(forecast_id: str, current_user: User = Depends(get_current_user)):
    data = await ForecastService.get_forecast(forecast_id, str(current_user.id))
    return APIResponse(success=True, data=data)


@router.delete("/{scenario_id}", response_model=APIResponse)
async def delete_forecast(scenario_id: str, current_user: User = Depends(get_current_user)):
    await ForecastService.delete_forecast(scenario_id, str(current_user.id), current_user.role)
    return APIResponse(success=True, message="Forecast deleted")
