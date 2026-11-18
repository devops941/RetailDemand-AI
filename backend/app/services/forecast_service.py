import os
import json
from fastapi import HTTPException
from app.models.forecast import ForecastScenario, ForecastResult
from app.models.ml_model import ModelRegistry, ModelMetrics, ModelStatus
from app.models.dataset import ProcessedDataset
from app.schemas.forecast import ForecastRequest
from app.utils.path_resolver import resolve_file_path


def _read_csv_as_dicts(file_path: str) -> list:
    import csv
    with open(file_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)


class ForecastService:

    @staticmethod
    async def generate_forecast(payload: ForecastRequest, user_id: str, scenario_name: str = None) -> dict:
        from app.ml.forecasting.forecaster import forecast as run_forecast

        model_registry = await ModelRegistry.get(payload.model_id)
        if not model_registry:
            raise HTTPException(status_code=404, detail="Model not found")
        if model_registry.status not in [ModelStatus.TRAINED, ModelStatus.ACTIVE, ModelStatus.ARCHIVED]:
            raise HTTPException(
                status_code=400,
                detail=f"Model status is '{model_registry.status}'. Only trained, active, or archived models can generate forecasts.",
            )
        artifact_path = resolve_file_path(model_registry.artifact_path)
        if not artifact_path or not os.path.exists(artifact_path):
            raise HTTPException(status_code=400, detail="Model artifact not found on disk. The model may need to be retrained.")

        with open(artifact_path, "r") as f:
            artifact = json.load(f)
        model_dict = artifact["model"]

        daily_preds = run_forecast(
            model_dict=model_dict,
            start_date=payload.start_date,
            end_date=payload.end_date,
            unit_price=payload.unit_price,
            discount_percentage=payload.discount_percentage,
            promotion_type=payload.promotion_type,
            holiday_indicator=payload.holiday_indicator,
        )

        total_units = sum(p["predicted_units"] for p in daily_preds)
        total_revenue = sum(p.get("expected_revenue") or 0 for p in daily_preds)
        avg_daily = total_units / max(len(daily_preds), 1)

        metrics = await ModelMetrics.find_one(ModelMetrics.model_id == payload.model_id)

        name = scenario_name or f"Forecast {str(payload.product_id)[:8]} {payload.start_date}"
        scenario = ForecastScenario(
            name=name,
            product_id=payload.product_id,
            product_name=payload.product_id,
            model_id=payload.model_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            unit_price=payload.unit_price,
            discount_percentage=payload.discount_percentage,
            promotion_type=payload.promotion_type,
            holiday_indicator=payload.holiday_indicator,
            store_id=payload.store_id,
            created_by=user_id,
        )
        await scenario.insert()

        result = ForecastResult(
            scenario_id=str(scenario.id),
            model_id=payload.model_id,
            product_id=payload.product_id,
            daily_predictions=daily_preds,
            total_predicted_units=round(total_units, 2),
            total_predicted_revenue=round(total_revenue, 2),
            model_mae=round(metrics.mae, 4) if metrics else None,
            model_rmse=round(metrics.rmse, 4) if metrics else None,
        )
        await result.insert()

        return {
            "forecast_id": str(result.id),
            "scenario_id": str(scenario.id),
            "scenario_name": name,
            "product_id": payload.product_id,
            "model_id": payload.model_id,
            "daily_predictions": daily_preds,
            "total_predicted_units": round(total_units, 2),
            "total_predicted_revenue": round(total_revenue, 2),
            "avg_daily_units": round(avg_daily, 2),
            "days_forecasted": len(daily_preds),
            "model_mae": round(metrics.mae, 4) if metrics else None,
            "model_rmse": round(metrics.rmse, 4) if metrics else None,
        }

    @staticmethod
    async def list_forecasts(user_id: str, role: str = None) -> list:
        scenarios = await ForecastScenario.find_many(
            ForecastScenario.created_by == user_id
        ).sort([("created_at", -1)]).to_list()
        result = []
        for s in scenarios:
            sid = str(s.id)
            fr = await ForecastResult.find_one(ForecastResult.scenario_id == sid)
            result.append({
                "scenario_id": sid, "forecast_id": str(fr.id) if fr else None,
                "scenario_name": s.name, "product_id": s.product_id, "model_id": s.model_id,
                "start_date": s.start_date, "end_date": s.end_date, "unit_price": s.unit_price,
                "discount_percentage": s.discount_percentage, "promotion_type": s.promotion_type,
                "holiday_indicator": s.holiday_indicator,
                "total_predicted_units": fr.total_predicted_units if fr else None,
                "total_predicted_revenue": fr.total_predicted_revenue if fr else None,
                "created_at": s.created_at.isoformat(),
            })
        return result

    @staticmethod
    async def get_forecast(forecast_id: str, user_id: str = None) -> dict:
        result = await ForecastResult.get(forecast_id)
        if not result:
            raise HTTPException(status_code=404, detail="Forecast not found")
        scenario = await ForecastScenario.get(result.scenario_id) if result.scenario_id else None
        if user_id and scenario and scenario.created_by != user_id:
            raise HTTPException(status_code=404, detail="Forecast not found")
        daily = result.daily_predictions
        total_units = result.total_predicted_units
        return {
            "forecast_id": str(result.id), "scenario_id": result.scenario_id,
            "scenario_name": scenario.name if scenario else None,
            "product_id": result.product_id, "model_id": result.model_id,
            "daily_predictions": daily, "total_predicted_units": total_units,
            "total_predicted_revenue": result.total_predicted_revenue,
            "avg_daily_units": round(total_units / max(len(daily), 1), 2),
            "days_forecasted": len(daily), "model_mae": result.model_mae,
            "model_rmse": result.model_rmse,
            "generated_at": result.generated_at.isoformat(),
            "start_date": scenario.start_date if scenario else None,
            "end_date": scenario.end_date if scenario else None,
        }

    @staticmethod
    async def delete_forecast(scenario_id: str, user_id: str, role: str = None):
        scenario = await ForecastScenario.get(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Forecast not found")
        if scenario.created_by != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this forecast")
        await ForecastResult.find_many(ForecastResult.scenario_id == scenario_id).delete()
        await scenario.delete()

    @staticmethod
    async def get_forecast_comparison(forecast_id: str, user_id: str = None) -> dict:
        result = await ForecastResult.get(forecast_id)
        if not result:
            raise HTTPException(status_code=404, detail="Forecast not found")
        scenario = await ForecastScenario.get(result.scenario_id) if result.scenario_id else None
        if user_id and scenario and scenario.created_by != user_id:
            raise HTTPException(status_code=404, detail="Forecast not found")
        predicted_map: dict = {p["date"]: p["predicted_units"] for p in result.daily_predictions}
        actual_map: dict = {}
        dataset_min_date = None
        dataset_max_date = None
        model_registry = await ModelRegistry.get(result.model_id)
        if model_registry:
            processed = await ProcessedDataset.find_one(ProcessedDataset.dataset_id == model_registry.dataset_id)
            proc_path = resolve_file_path(processed.processed_file_path) if processed else None
            if proc_path and os.path.exists(proc_path):
                try:
                    rows = _read_csv_as_dicts(proc_path)
                    rows = [{k.lower().strip(): v for k, v in r.items()} for r in rows]
                    if "date" in (rows[0] if rows else {}) and "quantity_sold" in (rows[0] if rows else {}):
                        if "product_id" in (rows[0] if rows else {}):
                            prod_rows = [r for r in rows if str(r.get("product_id", "")) == str(result.product_id)]
                            if prod_rows:
                                rows = prod_rows
                        all_dataset_dates = [r["date"][:10] for r in rows if r.get("date")]
                        if all_dataset_dates:
                            dataset_min_date = min(all_dataset_dates)
                            dataset_max_date = max(all_dataset_dates)
                        if scenario:
                            from datetime import datetime as dt
                            start = dt.strptime(scenario.start_date, "%Y-%m-%d")
                            end = dt.strptime(scenario.end_date, "%Y-%m-%d")
                            rows = [r for r in rows if r.get("date") and start <= dt.strptime(r["date"][:10], "%Y-%m-%d") <= end]
                        daily_sums: dict = {}
                        for r in rows:
                            date_key = r["date"][:10]
                            try:
                                daily_sums[date_key] = daily_sums.get(date_key, 0) + float(r.get("quantity_sold", 0))
                            except (ValueError, TypeError):
                                pass
                        actual_map = daily_sums
                except Exception:
                    pass

        all_dates = sorted(set(predicted_map.keys()) | set(actual_map.keys()))
        series = [
            {"date": d, "predicted": predicted_map.get(d), "actual": float(actual_map[d]) if d in actual_map else None}
            for d in all_dates
        ]
        overlap = [(predicted_map[d], actual_map[d]) for d in all_dates if d in predicted_map and d in actual_map]
        computed_mae = None
        computed_mape = None
        if overlap:
            errors = [abs(p - a) for p, a in overlap]
            computed_mae = round(sum(errors) / len(errors), 4)
            mape_vals = [abs(p - a) / max(abs(a), 1) * 100 for p, a in overlap]
            computed_mape = round(sum(mape_vals) / len(mape_vals), 2)
        return {
            "forecast_id": forecast_id, "scenario_name": scenario.name if scenario else None,
            "product_id": result.product_id, "series": series, "has_actual": len(actual_map) > 0,
            "dataset_start_date": dataset_min_date, "dataset_end_date": dataset_max_date,
            "scenario_start_date": scenario.start_date if scenario else None,
            "scenario_end_date": scenario.end_date if scenario else None,
            "overlap_days": len(overlap), "computed_mae": computed_mae, "computed_mape": computed_mape,
            "model_mae": result.model_mae, "model_rmse": result.model_rmse,
            "total_predicted": result.total_predicted_units,
            "total_actual": round(sum(actual_map.values()), 2) if actual_map else None,
        }
