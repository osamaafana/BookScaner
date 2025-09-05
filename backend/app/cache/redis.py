from functools import lru_cache

from redis.asyncio import from_url

from ..config import settings


@lru_cache
def get_redis():
    return from_url(settings.REDIS_URL, decode_responses=True)
