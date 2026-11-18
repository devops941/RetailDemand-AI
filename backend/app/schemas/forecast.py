from pydantic import BaseModel
from typing import Optional, List


class ForecastRequest(BaseModel):
    product_id: str
    model_id: str
    start_date: str
    end_date: str
    unit_price: float
    discount_percentage: float = 0.0
    promotion_type: Optional[str] = None
    holiday_indicator: bool = False
    store_id: Optional[str] = None


class ForecastDayResult(BaseModel):
    date: str
    predicted_units: float
    expected_revenue: Optional[float] = None


class ForecastResponse(BaseModel):
    scenario_id: str
    product_id: str
    model_id: str
    daily_predictions: List[ForecastDayResult]
    total_predicted_units: float
    total_predicted_revenue: Optional[float] = None
    model_mae: Optional[float] = None
    model_rmse: Optional[float] = None
