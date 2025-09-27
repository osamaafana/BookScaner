from functools import lru_cache
from urllib.parse import urlparse

from upstash_redis import Redis

from ..config import settings


@lru_cache
def get_redis():
    # Parse Upstash Redis URL format: redis://default:token@host:port
    if settings.REDIS_URL.startswith("redis://"):
        # Parse traditional Redis URL format
        parsed = urlparse(settings.REDIS_URL)
        if "upstash.io" in parsed.hostname:
            # Convert to Upstash format
            host = parsed.hostname
            token = parsed.password
            url = f"https://{host}"
            return Redis(url=url, token=token)
        else:
            # Fallback to traditional Redis
            from redis.asyncio import from_url

            return from_url(settings.REDIS_URL, decode_responses=True)
    else:
        # Assume it's already in Upstash format or direct URL
        return Redis(url=settings.REDIS_URL)
