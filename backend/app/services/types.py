from typing import Any, Dict, List, Optional

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
    x: float = Field(..., ge=0.0, le=1.0)
    y: float = Field(..., ge=0.0, le=1.0)
    w: float = Field(..., gt=0.0, le=1.0)
    h: float = Field(..., gt=0.0, le=1.0)


class Spine(BaseModel):
    bbox: Optional[BBox] = None
    text: str
    candidate_isbn: Optional[str] = None


class SpineResult(BaseModel):
    spines: List[Spine] = []


class BookAnalysisRequest(BaseModel):
    device_id: str
    books: List[Dict[str, Any]]  # List of book dictionaries with title, author, etc.
    user_preferences: Dict[str, Any] = {}  # genres, authors, languages


class BookScore(BaseModel):
    title: str
    author: Optional[str] = None
    cover_url: Optional[str] = None
    score: float  # 0-10 compatibility score
    recommendation: str  # AI-generated recommendation
    match_quality: str  # 'perfect', 'good', 'fair', 'poor'
    is_perfect_match: bool
    reasoning: str  # Detailed reasoning for the score


class BookAnalysisResponse(BaseModel):
    success: bool
    total_books_analyzed: int
    book_scores: List[BookScore]
    analysis_summary: Dict[str, Any]
    cached: bool  # Whether recommendations came from cache
    cache_hit_count: int  # Number of books found in cache


class BBoxOut(BaseModel):
    x: int
    y: int
    w: int
    h: int


class SpineOut(BaseModel):
    bbox: Optional[BBoxOut] = None
    text: str
    candidates: List[str] = []
