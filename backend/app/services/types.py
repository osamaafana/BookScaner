from typing import List, Optional

from pydantic import BaseModel, Field


class CanonicalBook(BaseModel):
    title: str
    author: Optional[str] = None
    isbn: Optional[str] = None
    cover_url: Optional[str] = None
    publisher: Optional[str] = None
    year: Optional[int] = None
    subjects: Optional[List[str]] = None
    fingerprint: str

    class Config:
        # For Pydantic v1 compatibility
        allow_population_by_field_name = True


class BBox(BaseModel):
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    w: int = Field(..., ge=1)
    h: int = Field(..., ge=1)


class Spine(BaseModel):
    bbox: Optional[BBox] = None
    text: str
    candidate_isbn: Optional[str] = None


class SpineResult(BaseModel):
    spines: List[Spine] = []


class Recommendation(BaseModel):
    title: str
    author: Optional[str] = None
    short_reason: Optional[str] = None


class RecsPayload(BaseModel):
    device_id: str
    saved_book_ids: List[int]  # canonical DB ids of saved books
    top_genres: List[str] = []
    top_authors: List[str] = []
    limit: int = 6


class BBoxOut(BaseModel):
    x: int
    y: int
    w: int
    h: int


class SpineOut(BaseModel):
    bbox: Optional[BBoxOut] = None
    text: str
    candidates: List[str] = []
