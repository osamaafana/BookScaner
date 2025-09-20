import logging

from app.cache.redis import get_redis
from app.config import settings
from app.db.session import async_engine
from app.services.cost_guard import get_month_spend
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text
from starlette.status import HTTP_401_UNAUTHORIZED

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/admin", tags=["admin"])


def _guard(admin_token: str | None):
    if not admin_token or admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(HTTP_401_UNAUTHORIZED, "invalid admin token")


@router.get("/metrics")
async def metrics(admin_token: str | None = Header(None, convert_underscores=False)):
    _guard(admin_token)
    blob = generate_latest()
    return Response(content=blob, media_type=CONTENT_TYPE_LATEST)


@router.post("/daily-check")
async def daily_check(
    admin_token: str | None = Header(None, convert_underscores=False)
):
    _guard(admin_token)
    groq_spend = await get_month_spend("groq")
    cap = float(getattr(settings, "GROQ_MONTHLY_USD_CAP", 10.0))
    alerts: list[str] = []
    if cap and groq_spend >= 0.8 * cap:
        alerts.append(f"groq spend at {groq_spend:.2f} / {cap:.2f}")
    # Stubs for error rate & cache hit (wire real metrics later)
    return {"ok": True, "alerts": alerts, "spend": {"groq": groq_spend, "cap": cap}}


@router.post("/flush-db")
async def flush_database(
    admin_token: str | None = Header(None, convert_underscores=False)
):
    """Flush database and cache - useful for testing and development"""
    _guard(admin_token)

    try:
        # Clear Redis cache
        redis_client = get_redis()
        await redis_client.flushdb()
        logger.info("Redis cache flushed successfully")

        # Clear database tables
        async with async_engine.connect() as conn:
            # Get all table names
            result = await conn.execute(
                text(
                    """
                SELECT tablename FROM pg_tables
                WHERE schemaname = 'public'
                AND tablename NOT LIKE 'alembic%'
            """
                )
            )
            tables = [row[0] for row in result.fetchall()]

            # Truncate all tables
            for table in tables:
                await conn.execute(
                    text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
                )
                logger.info(f"Truncated table: {table}")

            await conn.commit()

        logger.info("Database flushed successfully")
        return {
            "ok": True,
            "message": "Database and cache flushed successfully",
            "tables_cleared": len(tables),
            "tables": tables,
        }

    except Exception as e:
        logger.error(f"Failed to flush database: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to flush database: {str(e)}"
        )
