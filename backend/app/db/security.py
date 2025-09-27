"""
Database Security Configuration
Separates read/write users from migration users for enhanced security
"""

import os

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


class DatabaseSecurity:
    """Manages separate database connections for different security contexts"""

    def __init__(self):
        # Check if POSTGRES_URL is provided first
        postgres_url = os.getenv("POSTGRES_URL")
        if postgres_url:
            # Parse the URL to extract components
            from urllib.parse import urlparse

            parsed = urlparse(
                postgres_url.replace("postgresql+asyncpg://", "postgresql://")
            )
            self.app_user = parsed.username or "bookscanner"
            self.app_password = parsed.password or "bookscanner"
            self.host = parsed.hostname or "localhost"
            self.port = parsed.port or 5432
            self.database = parsed.path.lstrip("/") or "bookscanner"
        else:
            # Fallback to individual environment variables
            self.app_user = os.getenv("PG_USER", "bookscanner")
            self.app_password = os.getenv("PG_PASSWORD", "bookscanner")
            self.host = os.getenv("PG_HOST", "localhost")
            self.port = int(os.getenv("PG_PORT", "5432"))
            self.database = os.getenv("PG_DB", "bookscanner")

        # Migration users (can be different for security)
        self.migration_user = os.getenv("PG_MIGRATION_USER", self.app_user)
        self.migration_password = os.getenv("PG_MIGRATION_PASSWORD", self.app_password)

    def get_app_connection_string(self) -> str:
        """Get connection string for application (read/write) operations"""
        # Check if we have the original POSTGRES_URL with SSL parameters
        postgres_url = os.getenv("POSTGRES_URL")
        if postgres_url and "sslmode" in postgres_url:
            # Use the original URL but ensure it has asyncpg driver
            if postgres_url.startswith("postgresql://"):
                return postgres_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif postgres_url.startswith("postgresql+asyncpg://"):
                return postgres_url
        return f"postgresql+asyncpg://{self.app_user}:{self.app_password}@{self.host}:{self.port}/{self.database}"

    def get_migration_connection_string(self) -> str:
        """Get connection string for migration operations"""
        # Check if we have the original POSTGRES_URL with SSL parameters
        postgres_url = os.getenv("POSTGRES_URL")
        if postgres_url and "sslmode" in postgres_url:
            # Use the original URL but ensure it has asyncpg driver
            if postgres_url.startswith("postgresql://"):
                return postgres_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif postgres_url.startswith("postgresql+asyncpg://"):
                return postgres_url
        return f"postgresql+asyncpg://{self.migration_user}:{self.migration_password}@{self.host}:{self.port}/{self.database}"

    def create_app_engine(self):
        """Create async engine for application operations"""
        return create_async_engine(
            self.get_app_connection_string(),
            echo=False,
            pool_pre_ping=True,
            pool_recycle=3600,  # Recycle connections every hour
        )

    def create_migration_engine(self):
        """Create async engine for migration operations"""
        return create_async_engine(
            self.get_migration_connection_string(),
            echo=False,
            pool_pre_ping=True,
        )


# Global instance
db_security = DatabaseSecurity()

# Application engine (used by the app)
app_engine = db_security.create_app_engine()

# Migration engine (used by Alembic)
migration_engine = db_security.create_migration_engine()

# Session makers
AsyncSessionLocal = sessionmaker(
    app_engine, class_=AsyncSession, expire_on_commit=False
)

MigrationSessionLocal = sessionmaker(
    migration_engine, class_=AsyncSession, expire_on_commit=False
)
