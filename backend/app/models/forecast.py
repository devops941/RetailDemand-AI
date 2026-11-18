from beanie import Document
from pydantic import Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ForecastScenario(Document):
    name: str
    product_id: str
    product_name: str
    model_id: str
    start_date: str
    end_date: str
    unit_price: float
    discount_percentage: float = 0.0
    promotion_type: Optional[str] = None
    holiday_indicator: bool = False
    store_id: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "forecast_scenarios"


class ForecastResult(Document):
    scenario_id: str
    model_id: str
    product_id: str
    daily_predictions: List[Dict[str, Any]] = []
    total_predicted_units: float
    total_predicted_revenue: Optional[float] = None
    model_mae: Optional[float] = None
    model_rmse: Optional[float] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "forecast_results"
