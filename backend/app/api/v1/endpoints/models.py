from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.api.dependencies import get_current_user, require_analyst_or_admin
from app.models.user import User
from app.services.model_service import ModelService
from app.schemas.common import APIResponse

router = APIRouter()


class TrainRequest(BaseModel):
    dataset_id: str
    algorithm: str = "random_forest"
    name: str
    product_ids: Optional[List[str]] = None
    training_start_date: Optional[str] = None
    training_end_date: Optional[str] = None


@router.post("/train", response_model=APIResponse)
async def train_model(body: TrainRequest, current_user: User = Depends(require_analyst_or_admin)):
    if body.algorithm not in ["linear_regression", "random_forest", "gradient_boosting"]:
        raise HTTPException(status_code=400, detail="algorithm must be one of: linear_regression, random_forest, gradient_boosting")
    result = await ModelService.train_model(
        dataset_id=body.dataset_id,
        algorithm=body.algorithm,
        name=body.name,
        user_id=str(current_user.id),
        product_ids=body.product_ids,
        training_start_date=body.training_start_date,
        training_end_date=body.training_end_date,
    )
    return APIResponse(success=True, message="Model trained successfully", data=result)


@router.get("/", response_model=APIResponse)
async def list_models(current_user: User = Depends(get_current_user)):
    data = await ModelService.list_models(str(current_user.id), current_user.role)
    return APIResponse(success=True, data=data)


@router.get("/{model_id}", response_model=APIResponse)
async def get_model(model_id: str, current_user: User = Depends(get_current_user)):
    data = await ModelService.get_model_detail(model_id, str(current_user.id))
    return APIResponse(success=True, data=data)


@router.post("/{model_id}/activate", response_model=APIResponse)
async def activate_model(model_id: str, current_user: User = Depends(require_analyst_or_admin)):
    data = await ModelService.activate_model(model_id, str(current_user.id))
    return APIResponse(success=True, message="Model activated", data=data)


@router.delete("/{model_id}", response_model=APIResponse)
async def delete_model(model_id: str, current_user: User = Depends(get_current_user)):
    await ModelService.delete_model(model_id, str(current_user.id), current_user.role)
    return APIResponse(success=True, message="Model deleted")
