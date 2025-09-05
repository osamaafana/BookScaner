from typing import Any, Dict, List

from app.services.books_meta_service import BooksMetaService
from fastapi import APIRouter

router = APIRouter(tags=["books"])
_service = BooksMetaService()


@router.post("/books/enrich")
async def enrich_books(partials: List[Dict[str, Any]]):
    books = await _service.enrich_many(partials)
    return {"books": [b.dict() for b in books]}
