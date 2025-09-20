# backend/app/config.py
from pathlib import Path
from typing import List, Optional

from pydantic import BaseSettings, validator


class Settings(BaseSettings):
    # App
    APP_ENV: str = "dev"
    API_BASE_URL: str = "http://localhost:8000"
    LOG_LEVEL: str = "INFO"
    METRICS_ENABLED: bool = True
    ALERT_WEBHOOK_URL: Optional[str] = None
    MAX_UPLOAD_MB: int = 10

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"
    cors_origins_list: List[str] = []

    # Database (compose defaults, fallback to localhost for dev)
    PG_HOST: str = "localhost"
    PG_PORT: int = 5432
    PG_DB: str = "bookscanner"
    PG_USER: str = "bookscanner"
    PG_PASSWORD: str = "bookscanner"
    POSTGRES_URL: str = ""

    # Redis (fallback to localhost for dev)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Providers / models
    GROQ_API_KEY: str = ""
    GROQ_MONTHLY_CAP_USD: float = 10.0
    GROQ_ENABLED: bool = True
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    OLLAMA_RECS_MODEL: str = "llama-3.1-8b-instant"
    GCV_CREDENTIALS_JSON_PATH: Optional[str] = None
    OPENLIBRARY_ENABLED: bool = True
    GOOGLEBOOKS_API_KEY: str = ""
    GOOGLE_VISION_API_KEY: str = ""

    # NVIDIA NIM
    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL_NAME: str = "meta/llama-3.1-70b-instruct"
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com"

    # Metadata cache TTL (seconds)
    METADATA_TTL_SECS: int = 5 * 24 * 3600

    # Auth / admin
    JWT_SECRET: str = "change-me"
    ADMIN_TOKEN: str = "change-me"

    # Rate limits (provide sane defaults)
    RATE_LIMIT_PER_DEVICE_HOURLY: int = 10
    RATE_LIMIT_PER_DEVICE_DAILY: int = 30
    RATE_LIMIT_PER_IP_PER_MIN: int = 20
    RATE_LIMIT_PER_IP_DAILY: int = 200

    @validator("cors_origins_list", pre=True, always=True)
    def _split_cors(cls, v, values):
        raw = values.get("CORS_ORIGINS", "")
        return [o.strip() for o in raw.split(",") if o.strip()]

    @validator("POSTGRES_URL", pre=True, always=True)
    def _build_pg_url(cls, v, values):
        if v:
            # normalize to async driver if a sync URL was provided via env
            if v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
            return v
        user = values.get("PG_USER")
        pwd = values.get("PG_PASSWORD")
        host = values.get("PG_HOST")
        port = values.get("PG_PORT")
        db = values.get("PG_DB")
        return f"postgresql+asyncpg://{user}:{pwd}@{host}:{port}/{db}"

    class Config:
        env_file = str(Path(__file__).resolve().parents[2] / ".env")


settings = Settings()
