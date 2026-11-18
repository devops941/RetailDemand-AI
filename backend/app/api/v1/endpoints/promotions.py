from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.promotion_service import PromotionService
from app.schemas.common import APIResponse

router = APIRouter()


class ScenarioInput(BaseModel):
    label: str
    discount_percentage: float = 0.0
    promotion_type: Optional[str] = None
    holiday_indicator: bool = False


class CompareRequest(BaseModel):
    model_id: str
    product_id: str
    start_date: str
    end_date: str
    unit_price: float
    scenarios: List[ScenarioInput]


@router.post("/compare", response_model=APIResponse)
async def compare_scenarios(
    payload: CompareRequest,
    current_user: User = Depends(get_current_user),
):
    if not payload.scenarios:
        raise HTTPException(status_code=400, detail="At least one scenario is required")
    if len(payload.scenarios) > 8:
        raise HTTPException(status_code=400, detail="Maximum 8 scenarios allowed")
    result = await PromotionService.compare_scenarios(
        model_id=payload.model_id,
        product_id=payload.product_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        unit_price=payload.unit_price,
        scenarios=[s.model_dump() for s in payload.scenarios],
        user_id=str(current_user.id),
    )
    return APIResponse(success=True, message="Scenario comparison complete", data=result)
