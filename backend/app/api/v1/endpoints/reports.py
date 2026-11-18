from fastapi import APIRouter, Depends
from fastapi.responses import Response
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter()


@router.get("/forecast/{forecast_id}")
async def download_forecast_report(
    forecast_id: str,
    format: str = "csv",
    current_user: User = Depends(get_current_user),
):
    content, mime, filename = await ReportService.export_forecast(
        forecast_id, format, str(current_user.id)
    )
    return Response(
        content=content,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/dataset/{dataset_id}")
async def download_dataset_report(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
):
    content, mime, filename = await ReportService.export_dataset(
        dataset_id, str(current_user.id)
    )
    return Response(
        content=content,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/models")
async def download_models_report(
    format: str = "csv",
    current_user: User = Depends(get_current_user),
):
    content, mime, filename = await ReportService.export_models(
        str(current_user.id), current_user.role, format
    )
    return Response(
        content=content,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/analytics")
async def download_analytics_report(
    dataset_id: str,
    granularity: str = "monthly",
    format: str = "csv",
    current_user: User = Depends(get_current_user),
):
    content, mime, filename = await ReportService.export_analytics(
        dataset_id, granularity, format, str(current_user.id)
    )
    return Response(
        content=content,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
