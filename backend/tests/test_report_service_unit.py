import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_export_forecast_not_found():
    from app.services.report_service import ReportService
    with patch("app.services.report_service.ForecastResult") as MockResult:
        MockResult.get = AsyncMock(return_value=None)
        with pytest.raises(HTTPException) as exc_info:
            await ReportService.export_forecast("nonexistent_id", "csv")
        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_export_dataset_not_found():
    from app.services.report_service import ReportService
    with patch("app.services.report_service.ProcessedDataset") as MockProcessed, \
         patch("app.services.report_service.Dataset") as MockDataset:
        MockProcessed.find_one = AsyncMock(return_value=None)
        MockDataset.get = AsyncMock(return_value=None)
        with pytest.raises(HTTPException) as exc_info:
            await ReportService.export_dataset("nonexistent_id")
        assert exc_info.value.status_code == 404
