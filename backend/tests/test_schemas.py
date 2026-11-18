import pytest
from pydantic import ValidationError


def test_login_request_valid():
    from app.schemas.auth import LoginRequest
    req = LoginRequest(email="user@example.com", password="secret123")
    assert req.email == "user@example.com"
    assert req.password == "secret123"


def test_login_request_invalid_email():
    from app.schemas.auth import LoginRequest
    with pytest.raises(ValidationError):
        LoginRequest(email="not-an-email", password="secret123")


def test_register_request_defaults():
    from app.schemas.auth import RegisterRequest
    req = RegisterRequest(email="user@example.com", full_name="Jane Doe", password="pass1234")
    assert req.role == "analyst"
    assert req.full_name == "Jane Doe"


def test_forecast_request_valid():
    from app.schemas.forecast import ForecastRequest
    req = ForecastRequest(
        product_id="PROD001",
        model_id="507f1f77bcf86cd799439011",
        start_date="2024-01-01",
        end_date="2024-01-31",
        unit_price=19.99,
        discount_percentage=10.0,
        holiday_indicator=False,
    )
    assert req.unit_price == 19.99
    assert req.discount_percentage == 10.0
    assert req.holiday_indicator is False


def test_forecast_request_defaults():
    from app.schemas.forecast import ForecastRequest
    req = ForecastRequest(
        product_id="P1",
        model_id="m1",
        start_date="2024-01-01",
        end_date="2024-01-07",
        unit_price=5.0,
        holiday_indicator=False,
    )
    assert req.discount_percentage == 0.0
    assert req.promotion_type is None
    assert req.store_id is None
