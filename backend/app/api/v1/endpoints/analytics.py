from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, Literal
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.services.analytics_service import AnalyticsService
from app.schemas.common import APIResponse

router = APIRouter()


async def _verify_dataset_ownership(dataset_id: str, user_id: str):
    dataset = await Dataset.get(dataset_id)
    if not dataset or dataset.uploaded_by != user_id:
        raise HTTPException(status_code=404, detail="Dataset not found")


@router.get("/historical", response_model=APIResponse)
async def get_historical(
    dataset_id: str = Query(..., description="Dataset ID to analyse"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    granularity: Literal["daily", "monthly"] = Query("daily"),
    current_user: User = Depends(get_current_user),
):
    await _verify_dataset_ownership(dataset_id, str(current_user.id))
    data = await AnalyticsService.get_historical_trends(
        dataset_id, start_date, end_date, product_id, granularity
    )
    return APIResponse(success=True, data=data)


@router.get("/products", response_model=APIResponse)
async def get_product_analytics(
    dataset_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    await _verify_dataset_ownership(dataset_id, str(current_user.id))
    data = await AnalyticsService.get_product_analytics(dataset_id)
    return APIResponse(success=True, data=data)


@router.get("/categories", response_model=APIResponse)
async def get_category_analytics(
    dataset_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    await _verify_dataset_ownership(dataset_id, str(current_user.id))
    data = await AnalyticsService.get_category_analytics(dataset_id)
    return APIResponse(success=True, data=data)


@router.get("/promotions", response_model=APIResponse)
async def get_promotion_analytics(
    dataset_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    await _verify_dataset_ownership(dataset_id, str(current_user.id))
    data = await AnalyticsService.get_promotion_analytics(dataset_id)
    return APIResponse(success=True, data=data)


@router.get("/products-list", response_model=APIResponse)
async def get_products_list(
    dataset_id: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    await _verify_dataset_ownership(dataset_id, str(current_user.id))
    data = await AnalyticsService.get_dataset_products(dataset_id)
    return APIResponse(success=True, data=data)
