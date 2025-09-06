from app.config import settings
from app.services.cost_guard import get_month_spend
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.status import HTTP_401_UNAUTHORIZED

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
