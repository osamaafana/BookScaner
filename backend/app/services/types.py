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
