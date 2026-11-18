from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, users, dashboard, datasets, analytics, models, forecasts, promotions, reports, audit
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(models.router, prefix="/models", tags=["ML Models"])
api_router.include_router(forecasts.router, prefix="/forecasts", tags=["Forecasts"])
api_router.include_router(promotions.router, prefix="/promotions", tags=["Promotions"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(audit.router, prefix="/audit-logs", tags=["Audit Logs"])
