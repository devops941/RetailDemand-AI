from fastapi import APIRouter, Depends
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.dashboard_service import DashboardService
from app.schemas.common import APIResponse

router = APIRouter()


@router.get("/overview", response_model=APIResponse)
async def get_overview(current_user: User = Depends(get_current_user)):
    data = await DashboardService.get_overview(str(current_user.id))
    return APIResponse(success=True, data=data)


@router.get("/sales-trends", response_model=APIResponse)
async def get_sales_trends(current_user: User = Depends(get_current_user)):
    data = await DashboardService.get_sales_trends(str(current_user.id))
    return APIResponse(success=True, data=data)


@router.get("/top-products", response_model=APIResponse)
async def get_top_products(current_user: User = Depends(get_current_user)):
    data = await DashboardService.get_top_products(str(current_user.id))
    return APIResponse(success=True, data=data)
