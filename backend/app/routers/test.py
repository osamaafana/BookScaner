# backend/app/routers/test.py
from fastapi import APIRouter, Depends

from ..deps import rate_limit_dep

router = APIRouter(prefix="/v1/test", tags=["test"])


@router.get("/hello")
async def hello():
    return {"ok": True, "msg": "hello"}


@router.get("/throttle")
async def throttle(_=Depends(rate_limit_dep())):
    # If you got here, you weren't rate-limited
    return {"ok": True, "msg": "not rate-limited"}
