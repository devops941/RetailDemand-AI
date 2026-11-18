from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
import sys
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None


async def init_db():
    global client
    if settings.APP_ENV == "testing" or "pytest" in sys.modules:
        logger.info("Skipping database initialization in testing mode")
        return
    client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=3000)
    db = client[settings.MONGO_DB_NAME]

    from app.models.user import User, Role, Permission, RefreshToken
    from app.models.dataset import Dataset, DatasetValidationResult, ProcessedDataset
    from app.models.product import Product, ProductCategory
    from app.models.ml_model import ModelRegistry, ModelTrainingJob, ModelMetrics
    from app.models.forecast import ForecastScenario, ForecastResult
    from app.models.audit_log import AuditLog

    await init_beanie(
        database=db,
        document_models=[
            User, Role, Permission, RefreshToken,
            Dataset, DatasetValidationResult, ProcessedDataset,
            Product, ProductCategory,
            ModelRegistry, ModelTrainingJob, ModelMetrics,
            ForecastScenario, ForecastResult,
            AuditLog,
        ],
    )
    logger.info(f"Connected to MongoDB: {settings.MONGO_DB_NAME}")
    try:
        await seed_initial_data()
    except Exception as e:
        logger.warning(f"Seed data warning: {e}")


async def seed_initial_data():
    """Create default roles and admin user if not present."""
    from app.models.user import Role, User, Permission
    from app.core.security import get_password_hash
    from datetime import datetime

    admin_role = await Role.find_one(Role.name == "admin")
    if not admin_role:
        permissions = ["*"]
        admin_role = Role(name="admin", description="Full access", permissions=permissions)
        await admin_role.insert()

        analyst_role = Role(name="analyst", description="Business Analyst", permissions=[
            "datasets:read", "datasets:write", "models:read", "models:write",
            "forecasts:read", "forecasts:write", "analytics:read", "reports:read",
        ])
        await analyst_role.insert()

        manager_role = Role(name="manager", description="Business Manager", permissions=[
            "dashboard:read", "forecasts:read", "analytics:read", "reports:read",
        ])
        await manager_role.insert()

        logger.info("Default roles created")

    admin_user = await User.find_one(User.email == "admin@retaildemand.ai")
    if not admin_user:
        admin_user = User(
            email="admin@retaildemand.ai",
            full_name="System Administrator",
            hashed_password=get_password_hash("Admin@123"),
            role="admin",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await admin_user.insert()
        logger.info("Default admin user created: admin@retaildemand.ai / Admin@123")
