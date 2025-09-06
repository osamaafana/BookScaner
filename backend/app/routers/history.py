from typing import Any, Dict

from app.db.models import Book, History
from app.deps import device_id, get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_400_BAD_REQUEST

router = APIRouter(tags=["history"])


@router.get("/history")
async def get_history(
    db: AsyncSession = Depends(get_db),
    did: str = Depends(device_id),
    limit: int = Query(50, ge=1, le=200),
):
    q = await db.execute(
        select(History.id, History.action, History.at, Book.id, Book.title, Book.author)
        .join(Book, Book.id == History.book_id)
        .where(History.device_id == did)
        .order_by(History.at.desc())
        .limit(limit)
    )
    items = [
        {
            "id": hid,
            "action": action,
            "at": at.isoformat(),
            "book": {"id": bid, "title": title, "author": author},
        }
        for (hid, action, at, bid, title, author) in q.all()
    ]
    return {"items": items}


@router.post("/history")
async def add_history(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    did: str = Depends(device_id),
):
    action = payload.get("action")
    book_id = payload.get("book_id")
    if action not in {"scanned", "saved", "hide"}:
        raise HTTPException(
            HTTP_400_BAD_REQUEST, "action must be one of scanned/saved/hide"
        )
    if action in {"saved", "hide"} and not isinstance(book_id, int):
        raise HTTPException(
            HTTP_400_BAD_REQUEST, "book_id (int) required for saved/hide"
        )

    stmt = insert(History).values(device_id=did, book_id=book_id or 0, action=action)
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}
