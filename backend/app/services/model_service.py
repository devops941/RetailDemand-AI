import os
import json
from datetime import datetime
from fastapi import HTTPException
from app.models.ml_model import ModelRegistry, ModelMetrics, ModelTrainingJob, ModelStatus
from app.models.dataset import ProcessedDataset
from app.core.config import settings


def _read_csv_as_dicts(file_path: str) -> list:
    import csv
    with open(file_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)


class ModelService:

    @staticmethod
    async def train_model(
        dataset_id: str,
        algorithm: str,
        name: str,
        user_id: str,
        product_ids: list = None,
        training_start_date: str = None,
        training_end_date: str = None,
    ) -> dict:
        from app.ml.training.trainer import train

        processed = await ProcessedDataset.find_one(ProcessedDataset.dataset_id == dataset_id)
        if not processed:
            raise HTTPException(status_code=400, detail="Dataset not found or not processed")
        if not os.path.exists(processed.processed_file_path):
            raise HTTPException(status_code=400, detail="Processed file not found on disk")

        rows = _read_csv_as_dicts(processed.processed_file_path)
        # Normalize column names
        rows = [{k.lower().strip(): v for k, v in row.items()} for row in rows]

        if not rows or "date" not in rows[0] or "quantity_sold" not in rows[0]:
            raise HTTPException(status_code=400, detail="Processed dataset missing required columns (date, quantity_sold)")

        # Filter by product
        if product_ids:
            rows = [r for r in rows if str(r.get("product_id", "")) in [str(p) for p in product_ids]]

        # Filter by date range
        if training_start_date or training_end_date:
            from datetime import datetime as dt
            filtered = []
            for r in rows:
                try:
                    d = dt.strptime(r["date"][:10], "%Y-%m-%d")
                    if training_start_date and d < dt.strptime(training_start_date, "%Y-%m-%d"):
                        continue
                    if training_end_date and d > dt.strptime(training_end_date, "%Y-%m-%d"):
                        continue
                    filtered.append(r)
                except Exception:
                    pass
            rows = filtered

        if len(rows) < 10:
            raise HTTPException(status_code=400, detail="Insufficient data after filtering (need at least 10 rows)")

        registry = ModelRegistry(
            name=name,
            algorithm=algorithm,
            dataset_id=dataset_id,
            product_ids=product_ids or [],
            training_start_date=training_start_date,
            training_end_date=training_end_date,
            status=ModelStatus.TRAINING,
            created_by=user_id,
        )
        await registry.insert()
        model_id = str(registry.id)

        job = ModelTrainingJob(model_id=model_id, status="running", started_at=datetime.utcnow())
        await job.insert()

        try:
            model_dict, metrics_dict, feature_cols = train(rows, algorithm=algorithm)

            artifact_dir = os.path.join(settings.UPLOAD_DIR, "models")
            os.makedirs(artifact_dir, exist_ok=True)
            artifact_path = os.path.join(artifact_dir, f"{model_id}.json")
            with open(artifact_path, "w") as f:
                json.dump({"model": model_dict, "feature_cols": feature_cols}, f)

            # Determine date range from rows
            date_strs = [r["date"][:10] for r in rows if r.get("date")]
            date_strs.sort()
            val_start = date_strs[0] if date_strs else ""
            val_end = date_strs[-1] if date_strs else ""

            metrics = ModelMetrics(
                model_id=model_id,
                algorithm=algorithm,
                mae=metrics_dict["mae"],
                rmse=metrics_dict["rmse"],
                mape=metrics_dict.get("mape"),
                wape=metrics_dict.get("wape"),
                r2=metrics_dict.get("r2"),
                validation_period_start=val_start,
                validation_period_end=val_end,
            )
            await metrics.insert()

            registry.status = ModelStatus.TRAINED
            registry.artifact_path = artifact_path
            registry.feature_columns = feature_cols
            registry.updated_at = datetime.utcnow()
            await registry.save()

            job.status = "completed"
            job.progress = 100
            job.completed_at = datetime.utcnow()
            await job.save()

            return {
                "model_id": model_id,
                "name": name,
                "algorithm": algorithm,
                "status": "trained",
                "metrics": metrics_dict,
                "row_count": len(rows),
                "feature_count": len(feature_cols),
            }

        except Exception as e:
            registry.status = ModelStatus.FAILED
            registry.updated_at = datetime.utcnow()
            await registry.save()
            job.status = "failed"
            job.error = str(e)
            job.completed_at = datetime.utcnow()
            await job.save()
            raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

    @staticmethod
    async def list_models(user_id: str, role: str = None) -> list:
        models = await ModelRegistry.find_many(ModelRegistry.created_by == user_id).sort([("created_at", -1)]).to_list()
        result = []
        for m in models:
            # Auto-heal models previously demoted to ARCHIVED so they remain fully usable as TRAINED
            if m.status == ModelStatus.ARCHIVED:
                m.status = ModelStatus.TRAINED
                await m.save()
            mid = str(m.id)
            metrics = await ModelMetrics.find_one(ModelMetrics.model_id == mid)
            entry = {
                "id": mid, "name": m.name, "algorithm": m.algorithm,
                "dataset_id": m.dataset_id, "status": m.status, "version": m.version,
                "created_by": m.created_by, "created_at": m.created_at.isoformat(),
                "updated_at": m.updated_at.isoformat(), "product_ids": m.product_ids,
                "training_start_date": m.training_start_date, "training_end_date": m.training_end_date,
            }
            if metrics:
                entry["metrics"] = {
                    "mae": round(metrics.mae, 4), "rmse": round(metrics.rmse, 4),
                    "mape": round(metrics.mape, 2) if metrics.mape is not None else None,
                    "wape": round(metrics.wape, 4) if metrics.wape is not None else None,
                    "r2": round(metrics.r2, 4) if metrics.r2 is not None else None,
                    "validation_period_start": metrics.validation_period_start,
                    "validation_period_end": metrics.validation_period_end,
                }
            result.append(entry)
        return result

    @staticmethod
    async def get_model_detail(model_id: str, user_id: str = None) -> dict:
        model = await ModelRegistry.get(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        if user_id and model.created_by != user_id:
            raise HTTPException(status_code=404, detail="Model not found")
        metrics = await ModelMetrics.find_one(ModelMetrics.model_id == model_id)
        result = {
            "id": str(model.id), "name": model.name, "algorithm": model.algorithm,
            "dataset_id": model.dataset_id, "status": model.status, "version": model.version,
            "feature_columns": model.feature_columns, "product_ids": model.product_ids,
            "training_start_date": model.training_start_date, "training_end_date": model.training_end_date,
            "artifact_path": model.artifact_path, "created_by": model.created_by,
            "created_at": model.created_at.isoformat(),
        }
        if metrics:
            result["metrics"] = {
                "mae": round(metrics.mae, 4), "rmse": round(metrics.rmse, 4),
                "mape": round(metrics.mape, 2) if metrics.mape is not None else None,
                "wape": round(metrics.wape, 4) if metrics.wape is not None else None,
                "r2": round(metrics.r2, 4) if metrics.r2 is not None else None,
                "validation_period_start": metrics.validation_period_start,
                "validation_period_end": metrics.validation_period_end,
            }
        return result

    @staticmethod
    async def delete_model(model_id: str, user_id: str, role: str = None):
        model = await ModelRegistry.get(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        if model.created_by != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this model")
        if model.artifact_path and os.path.exists(model.artifact_path):
            os.remove(model.artifact_path)
        await ModelMetrics.find_many(ModelMetrics.model_id == model_id).delete()
        await ModelTrainingJob.find_many(ModelTrainingJob.model_id == model_id).delete()
        await model.delete()

    @staticmethod
    async def activate_model(model_id: str, user_id: str = None) -> dict:
        model = await ModelRegistry.get(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        if user_id and model.created_by != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to activate this model")
        if model.status not in [ModelStatus.TRAINED, ModelStatus.ACTIVE, ModelStatus.ARCHIVED]:
            raise HTTPException(status_code=400, detail="Only trained models can be activated")
        siblings = await ModelRegistry.find_many(
            ModelRegistry.created_by == model.created_by,
            ModelRegistry.status == ModelStatus.ACTIVE,
        ).to_list()
        for sib in siblings:
            sib.status = ModelStatus.TRAINED
            await sib.save()
        model.status = ModelStatus.ACTIVE
        model.updated_at = datetime.utcnow()
        await model.save()
        return {"id": model_id, "status": "active"}
