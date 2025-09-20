import json
from typing import Any

from ..deps import get_redis

# TTLs
SCAN_TTL = 30 * 24 * 3600  # 30d
META_TTL = 180 * 24 * 3600  # 180d
RECS_TTL = 7 * 24 * 3600  # 7d


async def cache_set(key: str, value: Any, ttl: int):
    r = get_redis()
    await r.setex(key, ttl, json.dumps(value))


async def cache_get(key: str) -> Any:
    r = get_redis()
    raw = await r.get(key)
    return json.loads(raw) if raw else None


# Key helpers
def scan_key(image_hash: str, groq_enabled: bool = True) -> str:
    return f"scan:{image_hash}:groq_{groq_enabled}"


def meta_key(fingerprint: str) -> str:
    return f"meta:{fingerprint}"


def recs_key(device_id: str, books_hash: str) -> str:
    return f"recs:{device_id}:{books_hash}"
