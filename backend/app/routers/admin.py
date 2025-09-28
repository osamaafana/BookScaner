import logging

from app.cache.redis import get_redis
from app.config import settings
from app.db.session import async_engine
from app.deps import device_id
from app.security.secrets import secret_manager
from app.services.cost_guard import get_month_spend
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text
from starlette.status import HTTP_401_UNAUTHORIZED

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/admin", tags=["admin"])


def _guard(admin_token: str | None):
    """Secure admin token validation with constant-time comparison"""
    if not secret_manager.validate_admin_token(admin_token):
        logger.warning("Invalid admin token attempt from IP")
        raise HTTPException(HTTP_401_UNAUTHORIZED, "invalid admin token")


@router.get("/metrics")
async def metrics(admin_token: str | None = Header(None, alias="X-Admin-Token")):
    _guard(admin_token)
    blob = generate_latest()
    return Response(
        content=blob,
        media_type=CONTENT_TYPE_LATEST,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "admin_token, content-type",
        },
    )


@router.post("/daily-check")
async def daily_check(
    admin_token: str | None = Header(None, alias="X-Admin-Token")
):
    _guard(admin_token)
    groq_spend = await get_month_spend("groq")
    cap = float(getattr(settings, "GROQ_MONTHLY_USD_CAP", 10.0))
    alerts: list[str] = []
    if cap and groq_spend >= 0.8 * cap:
        alerts.append(f"groq spend at {groq_spend:.2f} / {cap:.2f}")
    # Stubs for error rate & cache hit (wire real metrics later)
    return Response(
        status_code=200,
        content={
            "ok": True,
            "alerts": alerts,
            "spend": {"groq": groq_spend, "cap": cap},
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "admin_token, content-type",
        },
    )


@router.options("/flush-db")
async def flush_database_options():
    """Handle OPTIONS requests for CORS"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "admin_token, content-type",
        },
    )


@router.post("/flush-db")
async def flush_database(
    admin_token: str | None = Header(None, alias="X-Admin-Token")
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
        return Response(
            status_code=200,
            content={
                "ok": True,
                "message": "Database and cache flushed successfully",
                "tables_cleared": len(tables),
                "tables": tables,
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "admin_token, content-type",
            },
        )

    except Exception as e:
        logger.error(f"Failed to flush database: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to flush database: {str(e)}"
        )


@router.options("/flush-device")
async def flush_device_options():
    """Handle OPTIONS requests for CORS"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "admin_token, content-type, x-device-id",
        },
    )


@router.post("/flush-device")
async def flush_device_data(
    admin_token: str | None = Header(None, alias="X-Admin-Token"),
    did: str = Depends(device_id),
):
    """Flush all data for a specific device - useful for user data deletion"""
    _guard(admin_token)

    try:
        # Clear Redis cache for this device
        redis_client = get_redis()
        # Clear device-specific cache keys
        pattern = f"*:*{did}:*"
        if hasattr(redis_client, "keys"):
            # Upstash Redis (synchronous)
            keys = redis_client.keys(pattern)
            if keys:
                redis_client.delete(*keys)
                logger.info(f"Cleared {len(keys)} Redis keys for device {did}")
        else:
            # Traditional Redis (async)
            keys = await redis_client.keys(pattern)
            if keys:
                await redis_client.delete(*keys)
                logger.info(f"Cleared {len(keys)} Redis keys for device {did}")

        # Clear database records for this device
        async with async_engine.connect() as conn:
            # Delete from tables that have device_id
            tables_cleared = []

            # Delete scans
            result = await conn.execute(
                text("DELETE FROM scan WHERE device_id = :device_id"),
                {"device_id": did},
            )
            if result.rowcount > 0:
                tables_cleared.append(f"scan ({result.rowcount} records)")
                logger.info(f"Deleted {result.rowcount} scans for device {did}")

            # Delete preferences
            result = await conn.execute(
                text("DELETE FROM preference WHERE device_id = :device_id"),
                {"device_id": did},
            )
            if result.rowcount > 0:
                tables_cleared.append(f"preference ({result.rowcount} records)")
                logger.info(f"Deleted {result.rowcount} preferences for device {did}")

            # Delete history
            result = await conn.execute(
                text("DELETE FROM history WHERE device_id = :device_id"),
                {"device_id": did},
            )
            if result.rowcount > 0:
                tables_cleared.append(f"history ({result.rowcount} records)")
                logger.info(
                    f"Deleted {result.rowcount} history records for device {did}"
                )

            # Delete recommendations
            result = await conn.execute(
                text("DELETE FROM recommendation WHERE device_id = :device_id"),
                {"device_id": did},
            )
            if result.rowcount > 0:
                tables_cleared.append(f"recommendation ({result.rowcount} records)")
                logger.info(
                    f"Deleted {result.rowcount} recommendations for device {did}"
                )

            # Note: Books table doesn't have device_id, so we don't delete from it
            # This preserves the global book database while clearing user-specific data

            await conn.commit()

        logger.info(f"Device data flushed successfully for device {did}")
        return {
            "ok": True,
            "message": f"Device data flushed successfully for device {did}",
            "tables_cleared": len(tables_cleared),
            "tables": tables_cleared,
            "device_id": did,
        }

    except Exception as e:
        logger.error(f"Failed to flush device data for {did}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to flush device data: {str(e)}"
        )


@router.post("/rotate-admin-token")
async def rotate_admin_token(
    admin_token: str | None = Header(None, alias="X-Admin-Token"),
):
    """Rotate the admin token (admin only)"""
    _guard(admin_token)

    try:
        new_token = secret_manager.rotate_admin_token()
        logger.warning("Admin token rotated by admin user")

        return {
            "message": "Admin token rotated successfully",
            "new_token": new_token,
            "warning": "Please update your environment variables immediately!",
        }
    except Exception as e:
        logger.error(f"Failed to rotate admin token: {e}")
        raise HTTPException(500, f"Failed to rotate admin token: {e}")
