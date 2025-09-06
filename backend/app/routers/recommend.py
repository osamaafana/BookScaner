from typing import Any, Dict

from app.deps import device_id, get_db, rate_limit_dep
from app.services.recs_service import RecsService
from app.services.types import RecsPayload
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_400_BAD_REQUEST

router = APIRouter(tags=["recommend"])
_service = RecsService()


@router.post("/recommend", dependencies=[Depends(rate_limit_dep())])
async def recommend(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    did: str = Depends(device_id),
):
    # Validate payload and enforce device binding
    try:
        saved_ids = payload.get("saved_book_ids") or []
        top_genres = payload.get("top_genres") or []
        top_authors = payload.get("top_authors") or []
        limit = int(payload.get("limit", 6))
        rp = RecsPayload(
            device_id=did,
            saved_book_ids=saved_ids,
            top_genres=top_genres,
            top_authors=top_authors,
            limit=limit,
        )
    except Exception:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="bad payload")

    recs = await _service.recommend(db, rp)
    return {"recs": [r.dict() for r in recs]}
