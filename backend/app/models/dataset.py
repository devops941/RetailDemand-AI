from beanie import Document
from pydantic import Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class DatasetStatus(str, Enum):
    UPLOADED = "uploaded"
    VALIDATING = "validating"
    VALIDATED = "validated"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class Dataset(Document):
    name: str
    original_filename: str
    file_path: str
    file_size: int
    file_type: str
    status: DatasetStatus = DatasetStatus.UPLOADED
    uploaded_by: str
    row_count: Optional[int] = None
    column_names: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "datasets"


class DatasetValidationResult(Document):
    dataset_id: str
    total_rows: int = 0
    valid_rows: int = 0
    invalid_rows: int = 0
    duplicate_rows: int = 0
    missing_value_counts: Dict[str, int] = {}
    data_quality_percentage: float = 0.0
    warnings: List[str] = []
    errors: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "dataset_validation_results"


class ProcessedDataset(Document):
    dataset_id: str
    processed_file_path: str
    row_count: int
    feature_columns: List[str] = []
    target_column: str = "quantity_sold"
    processing_notes: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "processed_datasets"
