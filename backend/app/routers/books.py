from typing import Any, Dict, List

from app.db.models import Book, BookStatusEnum
from app.deps import get_db
from app.services.books_meta_service import BooksMetaService
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND

router = APIRouter(tags=["books"])
_service = BooksMetaService()


class UpdateBookStatusRequest(BaseModel):
    status: BookStatusEnum


@router.post("/books/enrich")
async def enrich_books(partials: List[Dict[str, Any]]):
    if not isinstance(partials, list):
        raise HTTPException(HTTP_400_BAD_REQUEST, "Body must be a JSON array")
    books = await _service.enrich_many(partials)
    return {"books": [b.dict() for b in books]}


@router.put("/books/{book_id}/status")
async def update_book_status(
    book_id: int, request: UpdateBookStatusRequest, db: AsyncSession = Depends(get_db)
):
    """Update the reading status of a book"""
    # Find the book
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()

    if not book:
        raise HTTPException(HTTP_404_NOT_FOUND, f"Book with id {book_id} not found")

    # Update the status
    book.status = request.status
    await db.commit()
    await db.refresh(book)

    return {
        "id": book.id,
        "title": book.title,
        "status": book.status,
        "message": f"Book status updated to {request.status.value}",
    }
