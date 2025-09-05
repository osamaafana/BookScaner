from sqlalchemy.ext.asyncio import create_async_engine

from ..config import settings

async_engine = create_async_engine(settings.POSTGRES_URL, pool_pre_ping=True)
