import os
import csv
import logging
from app.models.dataset import Dataset, ProcessedDataset
from app.models.ml_model import ModelRegistry
from app.models.forecast import ForecastResult, ForecastScenario
from app.utils.path_resolver import resolve_file_path

logger = logging.getLogger(__name__)


def _read_processed_rows(file_path: str):
    resolved = resolve_file_path(file_path)
    if not resolved or not os.path.exists(resolved):
        return []
    with open(resolved, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return [{k.lower().strip(): v for k, v in r.items()} for r in reader]


class DashboardService:
    @staticmethod
    async def get_overview(user_id: str = None) -> dict:
        if user_id:
            user_datasets = await Dataset.find_many(Dataset.uploaded_by == user_id).to_list()
            user_ds_ids = {str(d.id) for d in user_datasets}
            total_datasets = len(user_datasets)
            total_models = await ModelRegistry.find_many(ModelRegistry.created_by == user_id).count()
            scenarios = await ForecastScenario.find_many(ForecastScenario.created_by == user_id).to_list()
            total_forecasts = len(scenarios)
        else:
            total_datasets = await Dataset.find_many().count()
            total_models = await ModelRegistry.find_many().count()
            total_forecasts = await ForecastResult.find_many().count()
            user_ds_ids = None

        total_records = 0
        total_units = 0
        total_products = 0

        try:
            processed_list = await ProcessedDataset.find_many().to_list()
            if user_ds_ids is not None:
                processed_list = [p for p in processed_list if str(p.dataset_id) in user_ds_ids]
            if processed_list:
                prod_set = set()
                for p in processed_list:
                    rows = _read_processed_rows(p.processed_file_path)
                    total_records += len(rows)
                    total_units += int(sum(float(r.get("quantity_sold", 0) or 0) for r in rows))
                    prod_set.update(str(r.get("product_id", "")).strip() for r in rows if r.get("product_id"))
                total_products = len(prod_set)
        except Exception as e:
            logger.debug(f"Could not compute live sales stats: {e}")

        return {
            "total_datasets": total_datasets,
            "total_models": total_models,
            "total_forecasts": total_forecasts,
            "total_products": total_products,
            "total_sales_records": total_records,
            "total_units_sold": total_units,
        }

    @staticmethod
    async def get_sales_trends(user_id: str = None) -> dict:
        try:
            if user_id:
                user_datasets = await Dataset.find_many(Dataset.uploaded_by == user_id).to_list()
                user_ds_ids = {str(d.id) for d in user_datasets}
                if not user_ds_ids:
                    return {"daily": [], "monthly": [], "note": "No processed datasets yet"}
            else:
                user_ds_ids = None

            processed_list = await ProcessedDataset.find_many().to_list()
            if user_ds_ids is not None:
                processed_list = [p for p in processed_list if str(p.dataset_id) in user_ds_ids]
            if not processed_list:
                return {"daily": [], "monthly": [], "note": "No processed datasets yet"}
            latest = processed_list[-1]
            rows = _read_processed_rows(latest.processed_file_path)
            if not rows:
                return {"daily": [], "monthly": []}

            daily_map = {}
            monthly_map = {}
            for r in rows:
                d_str = r.get("date", "")[:10]
                if not d_str:
                    continue
                qty = float(r.get("quantity_sold", 0) or 0)
                daily_map[d_str] = daily_map.get(d_str, 0.0) + qty
                m_str = d_str[:7]
                monthly_map[m_str] = monthly_map.get(m_str, 0.0) + qty

            daily_list = [{"date": k, "units": int(daily_map[k])} for k in sorted(daily_map.keys())]
            monthly_list = [{"month": k, "units": int(monthly_map[k])} for k in sorted(monthly_map.keys())]

            return {
                "daily": daily_list[-90:],
                "monthly": monthly_list,
            }
        except Exception as e:
            logger.debug(f"Sales trends error: {e}")
            return {"daily": [], "monthly": []}

    @staticmethod
    async def get_top_products(user_id: str = None) -> list:
        try:
            if user_id:
                user_datasets = await Dataset.find_many(Dataset.uploaded_by == user_id).to_list()
                user_ds_ids = {str(d.id) for d in user_datasets}
                if not user_ds_ids:
                    return []
            else:
                user_ds_ids = None

            processed_list = await ProcessedDataset.find_many().to_list()
            if user_ds_ids is not None:
                processed_list = [p for p in processed_list if str(p.dataset_id) in user_ds_ids]
            if not processed_list:
                return []
            latest = processed_list[-1]
            rows = _read_processed_rows(latest.processed_file_path)
            if not rows:
                return []

            prod_map = {}
            for r in rows:
                pid = str(r.get("product_id", "")).strip()
                if not pid:
                    continue
                qty = float(r.get("quantity_sold", 0) or 0)
                if pid not in prod_map:
                    prod_map[pid] = {
                        "product_id": pid,
                        "product_name": r.get("product_name", pid),
                        "quantity_sold": 0.0,
                    }
                prod_map[pid]["quantity_sold"] += qty

            top = list(prod_map.values())
            top.sort(key=lambda x: x["quantity_sold"], reverse=True)
            for item in top:
                item["quantity_sold"] = int(item["quantity_sold"])
            return top[:10]
        except Exception as e:
            logger.debug(f"Top products error: {e}")
            return []
