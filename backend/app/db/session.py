from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from ..config import settings

# Use direct connection from deps.py (bypassing security layer temporarily)
async_engine = create_async_engine(settings.POSTGRES_URL, pool_pre_ping=True)
AsyncSessionLocal = sessionmaker(bind=async_engine, expire_on_commit=False)


# Session factory for dependency injection
async def get_db() -> AsyncSession:
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
