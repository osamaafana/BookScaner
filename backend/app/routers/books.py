from typing import Any, Dict, List

from app.services.books_meta_service import BooksMetaService
from fastapi import APIRouter, HTTPException
from starlette.status import HTTP_400_BAD_REQUEST

router = APIRouter(tags=["books"])
_service = BooksMetaService()


@router.post("/books/enrich")
async def enrich_books(partials: List[Dict[str, Any]]):
    if not isinstance(partials, list):
        raise HTTPException(HTTP_400_BAD_REQUEST, "Body must be a JSON array")
    books = await _service.enrich_many(partials)
    return {"books": [b.dict() for b in books]}
