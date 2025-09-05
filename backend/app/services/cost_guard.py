from datetime import datetime
from typing import Literal

from app.deps import get_redis

Provider = Literal["groq", "gcv"]


def _month_key(provider: Provider) -> str:
    ym = datetime.utcnow().strftime("%Y-%m")
    return f"spend:{provider}:{ym}"


async def record_spend(provider: Provider, usd: float):
    # record to Redis rolling month counter (and you can also insert into Postgres SpendLedger)
    r = get_redis()
    await r.incrbyfloat(_month_key(provider), float(usd))


async def get_month_spend(provider: Provider) -> float:
    r = get_redis()
    v = await r.get(_month_key(provider))
    return float(v or 0.0)
