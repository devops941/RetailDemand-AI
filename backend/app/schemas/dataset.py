from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime


class DatasetResponse(BaseModel):
    id: str
    name: str
    original_filename: str
    file_size: int
    file_type: str
    status: str
    row_count: Optional[int]
    column_names: List[str]
    created_at: datetime


class ValidationResultResponse(BaseModel):
    dataset_id: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    missing_value_counts: Dict[str, int]
    data_quality_percentage: float
    warnings: List[str]
    errors: List[str]
