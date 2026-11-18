import os
import csv
import io
import openpyxl
from fastapi import HTTPException
from app.models.forecast import ForecastResult, ForecastScenario
from app.models.ml_model import ModelRegistry, ModelMetrics
from app.models.dataset import Dataset, ProcessedDataset
from app.core.config import settings


def _rows_to_csv(rows: list, fieldnames: list) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        writer.writerow({f: r.get(f, "") if r.get(f) is not None else "" for f in fieldnames})
    return buf.getvalue().encode("utf-8")


def _rows_to_excel(rows: list, fieldnames: list, sheet_name: str = "Sheet1") -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name
    ws.append(fieldnames)
    for r in rows:
        ws.append([r.get(f, "") if r.get(f) is not None else "" for f in fieldnames])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


class ReportService:

    @staticmethod
    async def export_forecast(forecast_id: str, fmt: str = "csv", user_id: str = None) -> tuple:
        result = await ForecastResult.get(forecast_id)
        if not result:
            raise HTTPException(status_code=404, detail="Forecast not found")

        scenario = await ForecastScenario.get(result.scenario_id) if result.scenario_id else None
        if user_id and scenario and scenario.created_by != user_id:
            raise HTTPException(status_code=404, detail="Forecast not found")
        filename = f"forecast_{forecast_id[:8]}.{'xlsx' if fmt == 'excel' else 'csv'}"

        fieldnames = ["product_id", "scenario", "unit_price", "discount_pct", "date", "predicted_units", "expected_revenue"]
        rows = []
        for p in result.daily_predictions:
            rows.append({
                "product_id": result.product_id,
                "scenario": scenario.name if scenario else "",
                "unit_price": scenario.unit_price if scenario else "",
                "discount_pct": scenario.discount_percentage if scenario else "",
                "date": p.get("date", ""),
                "predicted_units": p.get("predicted_units", 0),
                "expected_revenue": p.get("expected_revenue", 0),
            })

        if fmt == "excel":
            content = _rows_to_excel(rows, fieldnames, sheet_name="Forecast")
            return content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename

        content = _rows_to_csv(rows, fieldnames)
        return content, "text/csv", filename

    @staticmethod
    async def export_dataset(dataset_id: str, user_id: str = None) -> tuple:
        dataset = await Dataset.get(dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if user_id and dataset.uploaded_by != user_id:
            raise HTTPException(status_code=404, detail="Dataset not found")

        processed = await ProcessedDataset.find_one(ProcessedDataset.dataset_id == dataset_id)
        if processed and os.path.exists(processed.processed_file_path):
            with open(processed.processed_file_path, "rb") as f:
                data = f.read()
            return data, "text/csv", f"dataset_{dataset_id[:8]}_processed.csv"

        if not os.path.exists(dataset.file_path):
            raise HTTPException(status_code=404, detail="Dataset file not found on disk")

        with open(dataset.file_path, "rb") as f:
            data = f.read()
        ext = dataset.file_type
        return data, "text/csv" if ext == "csv" else "application/octet-stream", f"dataset_{dataset_id[:8]}.{ext}"

    @staticmethod
    async def export_models(user_id: str, role: str = None, fmt: str = "csv") -> tuple:
        models = await ModelRegistry.find_many(
            ModelRegistry.created_by == user_id
        ).sort([("created_at", -1)]).to_list()

        rows = []
        for m in models:
            mid = str(m.id)
            metrics = await ModelMetrics.find_one(ModelMetrics.model_id == mid)
            row = {
                "id": mid,
                "name": m.name,
                "algorithm": m.algorithm,
                "status": m.status,
                "version": m.version,
                "dataset_id": m.dataset_id,
                "created_at": m.created_at.isoformat() if m.created_at else "",
            }
            if metrics:
                row.update({
                    "mae": metrics.mae,
                    "rmse": metrics.rmse,
                    "mape": metrics.mape,
                    "wape": metrics.wape,
                    "r2": metrics.r2,
                    "val_period_start": metrics.validation_period_start or "",
                    "val_period_end": metrics.validation_period_end or "",
                })
            rows.append(row)

        fieldnames = [
            "id", "name", "algorithm", "status", "version", "dataset_id",
            "created_at", "mae", "rmse", "mape", "wape", "r2",
            "val_period_start", "val_period_end",
        ]
        filename = f"model_metrics.{'xlsx' if fmt == 'excel' else 'csv'}"

        if fmt == "excel":
            content = _rows_to_excel(rows, fieldnames, sheet_name="Models")
            return content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename

        content = _rows_to_csv(rows, fieldnames)
        return content, "text/csv", filename

    @staticmethod
    async def export_analytics(dataset_id: str, granularity: str = "monthly", fmt: str = "csv", user_id: str = None) -> tuple:
        dataset = await Dataset.get(dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if user_id and dataset.uploaded_by != user_id:
            raise HTTPException(status_code=404, detail="Dataset not found")

        processed = await ProcessedDataset.find_one(ProcessedDataset.dataset_id == dataset_id)
        if not processed or not os.path.exists(processed.processed_file_path):
            raise HTTPException(status_code=400, detail="Processed dataset not found. Process the dataset first.")

        with open(processed.processed_file_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            raw_rows = list(reader)

        if not raw_rows:
            raise HTTPException(status_code=400, detail="Dataset has no data rows")

        rows = [{k.lower().strip(): v for k, v in r.items()} for r in raw_rows]
        first_row = rows[0]
        if "date" not in first_row or "quantity_sold" not in first_row:
            raise HTTPException(status_code=400, detail="Dataset missing required columns (date, quantity_sold)")

        period_map: dict = {}
        has_price = "unit_price" in first_row

        for r in rows:
            date_str = str(r.get("date", "")).strip()
            if not date_str:
                continue
            period = date_str[:7] if granularity == "monthly" else date_str[:10]

            try:
                qty = float(r.get("quantity_sold", 0) or 0)
            except (ValueError, TypeError):
                qty = 0.0

            rev = 0.0
            if has_price:
                try:
                    price = float(r.get("unit_price", 0) or 0)
                    rev = qty * price
                except (ValueError, TypeError):
                    rev = 0.0

            if period not in period_map:
                period_map[period] = {"count": 0, "total_units": 0.0, "total_revenue": 0.0}
            period_map[period]["count"] += 1
            period_map[period]["total_units"] += qty
            period_map[period]["total_revenue"] += rev

        agg_rows = []
        for period in sorted(period_map.keys()):
            p_data = period_map[period]
            count = max(p_data["count"], 1)
            row_dict = {
                "period": period,
                "total_units": round(p_data["total_units"], 1),
                "avg_units": round(p_data["total_units"] / count, 2),
            }
            if has_price:
                row_dict["total_revenue"] = round(p_data["total_revenue"], 2)
            agg_rows.append(row_dict)

        fieldnames = ["period", "total_units", "avg_units"]
        if has_price:
            fieldnames.append("total_revenue")

        filename = f"analytics_{dataset_id[:8]}_{granularity}.{'xlsx' if fmt == 'excel' else 'csv'}"

        if fmt == "excel":
            content = _rows_to_excel(agg_rows, fieldnames, sheet_name="Analytics")
            return content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename

        content = _rows_to_csv(agg_rows, fieldnames)
        return content, "text/csv", filename
