import os
import csv
import uuid
from fastapi import UploadFile, HTTPException
from app.models.dataset import Dataset, DatasetStatus, DatasetValidationResult, ProcessedDataset
from app.core.config import settings
from datetime import datetime, timezone

REQUIRED_COLUMNS = {"date", "product_id", "product_name", "category", "quantity_sold"}


def _read_csv_rows(file_path: str) -> tuple:
    """Returns (fieldnames: list, rows: list[dict])"""
    with open(file_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = list(reader.fieldnames) if reader.fieldnames else []
    return fieldnames, rows


class DatasetService:
    @staticmethod
    async def upload(file: UploadFile, name: str, user_id: str) -> Dataset:
        ext = file.filename.rsplit(".", 1)[-1].lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type .{ext} not allowed")
        content = await file.read()
        if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File exceeds size limit")
        filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        columns = []
        row_count = None
        if ext == "csv":
            try:
                fieldnames, rows = _read_csv_rows(file_path)
                columns = fieldnames
                row_count = len(rows)
            except Exception:
                columns = []
                row_count = None
        elif ext == "xlsx":
            try:
                import pandas as pd
                df = pd.read_excel(file_path)
                columns = [str(c) for c in df.columns]
                row_count = len(df)
            except Exception:
                pass

        dataset = Dataset(
            name=name,
            original_filename=file.filename,
            file_path=file_path,
            file_size=len(content),
            file_type=ext,
            status=DatasetStatus.UPLOADED,
            uploaded_by=user_id,
            row_count=row_count,
            column_names=columns,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        await dataset.insert()
        return dataset

    @staticmethod
    async def list_datasets(user_id: str, role: str = None):
        datasets = await Dataset.find_many(Dataset.uploaded_by == user_id).sort([("created_at", -1)]).to_list()

        result = []
        for d in datasets:
            row_count = d.row_count
            if row_count is None and d.file_path and os.path.exists(d.file_path):
                try:
                    if d.file_type == "csv":
                        _, rows = _read_csv_rows(d.file_path)
                        row_count = len(rows)
                        d.row_count = row_count
                        await d.save()
                    elif d.file_type == "xlsx":
                        import pandas as pd
                        df = pd.read_excel(d.file_path)
                        row_count = len(df)
                        d.row_count = row_count
                        await d.save()
                except Exception:
                    pass
            result.append({
                "id": str(d.id),
                "name": d.name,
                "original_filename": d.original_filename,
                "file_size": d.file_size,
                "status": d.status,
                "row_count": row_count,
                "created_at": d.created_at.isoformat()
            })
        return result

    @staticmethod
    async def get_dataset(dataset_id: str, user_id: str = None):
        dataset = await Dataset.get(dataset_id)
        if not dataset:
            return None
        if user_id and dataset.uploaded_by != user_id:
            return None
        row_count = dataset.row_count
        if row_count is None and dataset.file_path and os.path.exists(dataset.file_path):
            try:
                if dataset.file_type == "csv":
                    _, rows = _read_csv_rows(dataset.file_path)
                    row_count = len(rows)
                    dataset.row_count = row_count
                    await dataset.save()
                elif dataset.file_type == "xlsx":
                    import pandas as pd
                    df = pd.read_excel(dataset.file_path)
                    row_count = len(df)
                    dataset.row_count = row_count
                    await dataset.save()
            except Exception:
                pass
        return {
            "id": str(dataset.id),
            "name": dataset.name,
            "original_filename": dataset.original_filename,
            "file_type": dataset.file_type,
            "file_size": dataset.file_size,
            "status": dataset.status,
            "row_count": row_count,
            "column_names": dataset.column_names,
            "created_at": dataset.created_at.isoformat()
        }

    @staticmethod
    async def delete_dataset(dataset_id: str, user_id: str, role: str = None):
        dataset = await Dataset.get(dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if dataset.uploaded_by != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this dataset")
        if os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)
        await dataset.delete()

    @staticmethod
    async def validate_dataset(dataset_id: str, user_id: str = None) -> dict:
        dataset = await Dataset.get(dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if user_id and dataset.uploaded_by != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this dataset")
        if dataset.file_type != "csv":
            raise HTTPException(status_code=400, detail="Only CSV files are supported for validation in this environment")
        try:
            fieldnames, rows = _read_csv_rows(dataset.file_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cannot read file: {str(e)}")

        total_rows = len(rows)
        lower_cols = {col.lower().strip() for col in fieldnames}
        missing_cols = REQUIRED_COLUMNS - lower_cols
        errors = [f"Missing required column: {col}" for col in sorted(missing_cols)]
        warnings = []

        # Count duplicates
        seen: set = set()
        duplicate_count = 0
        for row in rows:
            key = tuple(sorted((k, v) for k, v in row.items()))
            if key in seen:
                duplicate_count += 1
            else:
                seen.add(key)

        # Count missing values per column
        missing_counts: dict = {}
        for col in fieldnames:
            missing = sum(1 for row in rows if not str(row.get(col, "")).strip())
            if missing > 0:
                missing_counts[col] = missing

        invalid_rows = duplicate_count + (1 if missing_counts else 0)
        valid_rows = max(0, total_rows - invalid_rows)
        quality = round((valid_rows / total_rows * 100) if total_rows > 0 else 0.0, 2)

        result = DatasetValidationResult(
            dataset_id=dataset_id,
            total_rows=total_rows,
            valid_rows=valid_rows,
            invalid_rows=invalid_rows,
            duplicate_rows=duplicate_count,
            missing_value_counts=missing_counts,
            data_quality_percentage=quality,
            warnings=warnings,
            errors=errors,
        )
        await result.insert()

        dataset.status = DatasetStatus.VALIDATED
        dataset.row_count = total_rows
        dataset.column_names = fieldnames
        await dataset.save()

        return {"total_rows": total_rows, "valid_rows": valid_rows, "invalid_rows": invalid_rows,
                "duplicate_rows": duplicate_count, "missing_value_counts": missing_counts,
                "data_quality_percentage": quality, "warnings": warnings, "errors": errors}

    @staticmethod
    async def process_dataset(dataset_id: str, user_id: str = None) -> dict:
        dataset = await Dataset.get(dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        if user_id and dataset.uploaded_by != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to process this dataset")
        if dataset.file_type != "csv":
            raise HTTPException(status_code=400, detail="Only CSV files are supported in this environment")
        try:
            fieldnames, rows = _read_csv_rows(dataset.file_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cannot read file: {str(e)}")

        # Normalize column names to lowercase
        lower_fieldnames = [col.lower().strip() for col in fieldnames]

        # Remap rows to lowercase column names
        norm_rows = []
        for row in rows:
            norm = {col.lower().strip(): val for col, val in row.items()}
            norm_rows.append(norm)

        # Remove duplicates
        seen: set = set()
        deduped = []
        for row in norm_rows:
            key = tuple(sorted(row.items()))
            if key not in seen:
                seen.add(key)
                deduped.append(row)

        # Parse and validate date column
        processed = []
        for row in deduped:
            if "date" in row:
                date_str = str(row["date"]).strip()
                valid_date = False
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
                    try:
                        d = datetime.strptime(date_str, fmt)
                        row["date"] = d.strftime("%Y-%m-%d")
                        valid_date = True
                        break
                    except ValueError:
                        continue
                if not valid_date:
                    continue  # skip rows with invalid dates
            processed.append(row)

        processed_filename = f"processed_{dataset_id}.csv"
        processed_path = os.path.join(settings.UPLOAD_DIR, processed_filename)

        if processed:
            with open(processed_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=lower_fieldnames)
                writer.writeheader()
                writer.writerows(processed)

        proc_doc = ProcessedDataset(
            dataset_id=dataset_id,
            processed_file_path=processed_path,
            row_count=len(processed),
            feature_columns=lower_fieldnames,
        )
        await proc_doc.insert()

        dataset.status = DatasetStatus.PROCESSED
        await dataset.save()

        return {"processed_rows": len(processed), "columns": lower_fieldnames}
