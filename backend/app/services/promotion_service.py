import os
import json
from fastapi import HTTPException
from app.models.ml_model import ModelRegistry, ModelStatus
from app.ml.forecasting.forecaster import forecast as run_forecast
from app.utils.path_resolver import resolve_file_path


class PromotionService:

    @staticmethod
    async def compare_scenarios(
        model_id: str,
        product_id: str,
        start_date: str,
        end_date: str,
        unit_price: float,
        scenarios: list,
        user_id: str = None,
    ) -> dict:
        model_registry = await ModelRegistry.get(model_id)
        if not model_registry:
            raise HTTPException(status_code=404, detail="Model not found")
        if user_id and model_registry.created_by != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this model")
        if model_registry.status not in [ModelStatus.TRAINED, ModelStatus.ACTIVE, ModelStatus.ARCHIVED]:
            raise HTTPException(
                status_code=400,
                detail=f"Model status is '{model_registry.status}'. Only trained, active, or archived models can run promotion analysis.",
            )
        artifact_path = resolve_file_path(model_registry.artifact_path)
        if not artifact_path or not os.path.exists(artifact_path):
            raise HTTPException(
                status_code=400,
                detail="Model artifact not found on disk. The model may need to be retrained.",
            )

        with open(artifact_path, "r") as f:
            artifact = json.load(f)
        model_dict = artifact["model"]

        results = []
        baseline_units = None
        dates_count = 0

        for scenario in scenarios:
            label = scenario.get("label") or f"{scenario.get('discount_percentage', 0)}% discount"
            discount = float(scenario.get("discount_percentage", 0))
            promo = scenario.get("promotion_type") or None
            holiday = bool(scenario.get("holiday_indicator", False))
            effective_price = unit_price * (1 - discount / 100)

            daily_preds = run_forecast(
                model_dict=model_dict,
                start_date=start_date,
                end_date=end_date,
                unit_price=unit_price,
                discount_percentage=discount,
                promotion_type=promo,
                holiday_indicator=holiday,
            )

            if not daily_preds:
                raise HTTPException(status_code=400, detail="No forecast dates. Check start_date and end_date.")

            dates_count = len(daily_preds)
            total_units = sum(p["predicted_units"] for p in daily_preds)
            total_revenue = sum(p.get("expected_revenue") or 0 for p in daily_preds)

            if baseline_units is None:
                baseline_units = total_units

            lift_pct = (
                ((total_units - baseline_units) / max(baseline_units, 0.001)) * 100
                if baseline_units is not None
                else 0.0
            )

            results.append({
                "label": label,
                "discount_percentage": discount,
                "promotion_type": promo,
                "holiday_indicator": holiday,
                "effective_price": round(effective_price, 2),
                "total_units": round(total_units, 1),
                "total_revenue": round(total_revenue, 2),
                "avg_daily_units": round(total_units / max(dates_count, 1), 2),
                "lift_vs_baseline_pct": round(lift_pct, 1),
                "daily_predictions": daily_preds,
            })

        best_units = max(results, key=lambda r: r["total_units"])
        best_revenue = max(results, key=lambda r: r["total_revenue"])

        return {
            "model_id": model_id,
            "product_id": product_id,
            "start_date": start_date,
            "end_date": end_date,
            "unit_price": unit_price,
            "days": dates_count,
            "scenarios": results,
            "best_units_scenario": best_units["label"],
            "best_revenue_scenario": best_revenue["label"],
        }
