from pydantic_settings import BaseSettings
from typing import List
import os

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_ENV_FILE = os.path.join(_BASE_DIR, ".env")


class Settings(BaseSettings):
    APP_NAME: str = "RetailDemandAI"
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "retaildemand_ai"

    SECRET_KEY: str = "default-insecure-secret-key-change-in-production-retaildemandai-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://localhost:80",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
    ]

    UPLOAD_DIR: str = os.path.join(_BASE_DIR, "uploads")
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: List[str] = ["csv", "xlsx"]

    ARTIFACTS_DIR: str = os.path.join(_BASE_DIR, "artifacts")
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = os.path.join(_BASE_DIR, "logs", "app.log")

    RATE_LIMIT_PER_MINUTE: int = 60

    model_config = {
        "env_file": (_ENV_FILE, ".env"),
        "extra": "ignore",
        "case_sensitive": True,
    }


settings = Settings()

for d in [settings.UPLOAD_DIR, settings.ARTIFACTS_DIR, os.path.dirname(settings.LOG_FILE)]:
    os.makedirs(d, exist_ok=True)
