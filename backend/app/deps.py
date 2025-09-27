# backend/app/deps.py
from __future__ import annotations

import re
from typing import AsyncGenerator, Callable

from fastapi import Depends, HTTPException, Request
from redis.asyncio import from_url
from sqlalchemy.ext.asyncio import (AsyncSession, async_sessionmaker,
                                    create_async_engine)
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_429_TOO_MANY_REQUESTS

from .config import settings

# --- DB session factory ---
_engine = create_async_engine(settings.POSTGRES_URL, pool_pre_ping=True)
_session_factory = async_sessionmaker(bind=_engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _session_factory() as session:
        yield session


# --- Redis client singleton ---
_redis = from_url(settings.REDIS_URL, decode_responses=True)


def get_redis():
    return _redis


# --- Helpers ---
# Updated regex to match UUID format (8-4-4-4-12 hex digits)
_DEVICE_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)


def client_ip(req: Request) -> str:
    # honor proxies (your web-gateway should set X-Forwarded-For)
    xff = req.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return req.client.host if req.client else "0.0.0.0"


def device_id(req: Request) -> str:
    did = req.headers.get("x-device-id") or req.cookies.get("device_id")
    if not did or not _DEVICE_ID_RE.match(did):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="Missing/invalid device_id (provide X-Device-Id header or device_id cookie).",
        )
    return did


# --- Rate limit dependency ---
async def _incr_with_ttl(r, key: str, expire: int) -> int:
    # atomic-ish: set TTL on first increment
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, expire)
    res = await pipe.execute()
    return int(res[0])


def rate_limit_dep() -> Callable:
    """
    Use as a dependency in routes to enforce IP + device limits:
      - per IP per minute and per day
      - per device per hour and per day
    """

    async def _check(req: Request, r=Depends(get_redis), did: str = Depends(device_id)):
        ip = client_ip(req)

        keys = {
            "ip_min": (f"rl:ip:{ip}:m", 60, settings.RATE_LIMIT_PER_IP_PER_MIN),
            "ip_day": (f"rl:ip:{ip}:d", 86400, settings.RATE_LIMIT_PER_IP_DAILY),
            "dev_hour": (
                f"rl:dev:{did}:h",
                3600,
                settings.RATE_LIMIT_PER_DEVICE_HOURLY,
            ),
            "dev_day": (f"rl:dev:{did}:d", 86400, settings.RATE_LIMIT_PER_DEVICE_DAILY),
        }

        counts = {}
        # increment all windows
        for name, (key, ttl, _limit) in keys.items():
            counts[name] = await _incr_with_ttl(r, key, ttl)

        # check limits
        violations = []
        for name, count in counts.items():
            limit = keys[name][2]
            if count > limit:
                violations.append((name, count, limit))

        if violations:
            # Choose a simple Retry-After: 60s for minute window, 3600s for hour, 86400s for day.
            retry_after = 60
            names = [v[0] for v in violations]
            if any("dev_hour" in n for n in names):
                retry_after = 3600
            if any("day" in n for n in names):
                retry_after = 86400
            raise HTTPException(
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limited",
                    "violations": [
                        {"window": n, "count": c, "limit": limit}
                        for n, c, limit in violations
                    ],
                },
                headers={"Retry-After": str(retry_after)},
            )

    return _check
