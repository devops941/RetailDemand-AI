from beanie import Document
from pydantic import Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ModelStatus(str, Enum):
    TRAINING = "training"
    TRAINED = "trained"
    ACTIVE = "active"
    ARCHIVED = "archived"
    FAILED = "failed"


class ModelRegistry(Document):
    name: str
    algorithm: str
    dataset_id: str
    product_ids: List[str] = []
    training_start_date: Optional[str] = None
    training_end_date: Optional[str] = None
    feature_columns: List[str] = []
    artifact_path: Optional[str] = None
    status: ModelStatus = ModelStatus.TRAINING
    version: int = 1
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "model_registry"


class ModelTrainingJob(Document):
    model_id: str
    status: str = "queued"
    progress: int = 0
    logs: List[str] = []
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "model_training_jobs"


class ModelMetrics(Document):
    model_id: str
    algorithm: str
    mae: float
    rmse: float
    mape: Optional[float] = None
    wape: float
    r2: Optional[float] = None
    validation_period_start: str
    validation_period_end: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "model_metrics"
