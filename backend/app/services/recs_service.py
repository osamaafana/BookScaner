# app/services/recs_service.py

import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.adapters.ollama_recs import LlamaRecsAdapter
from app.db.models import ActionEnum, Book, Device, History, Recommendation
from app.services.types import (BookAnalysisRequest, BookAnalysisResponse,
                                BookScore)
from sqlalchemy import and_, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)


def _norm(s: Optional[str]) -> str:
    """Normalize string for consistent matching."""
    return (s or "").strip()


def _key_from_book(b: Dict[str, Any]) -> tuple[str, str]:
    """Extract normalized (title, author) key from book dict."""
    return (_norm(b.get("title")), _norm(b.get("author")))


def _coerce_score(v) -> float:
    """Safely convert value to float, handling NaN and invalid inputs."""
    try:
        s = float(v)
        return 0.0 if (s != s) else s  # NaN -> 0
    except Exception:
        return 0.0


class RecsService:
    def __init__(self):
        self.adapter = LlamaRecsAdapter()
        logger.info("RecsService initialized")

    async def analyze_books_with_preferences(
        self, db: AsyncSession, request: BookAnalysisRequest
    ) -> BookAnalysisResponse:
        """Analyze a list of books against user preferences with hybrid caching."""
        logger.info(
            f"Analyzing {len(request.books)} books for device {request.device_id}"
        )

        # Get cached recommendations as a map
        cached_map = await self._get_cached_map(db, request)
        missing_books = [
            b for b in request.books if _key_from_book(b) not in cached_map
        ]

        if not missing_books:
            # All books are cached
            book_scores = [cached_map[_key_from_book(b)] for b in request.books]
            analysis_summary = {
                "perfect_matches": sum(1 for s in book_scores if s.is_perfect_match),
                "average_score": (
                    sum(s.score for s in book_scores) / len(book_scores)
                    if book_scores
                    else 0
                ),
                "highest_score": max((s.score for s in book_scores), default=0),
            }
            return BookAnalysisResponse(
                success=True,
                total_books_analyzed=len(request.books),
                book_scores=book_scores,
                analysis_summary=analysis_summary,
                cached=True,
                cache_hit_count=len(book_scores),
            )

        # Build prompt for only missing books
        user_preferences = request.user_preferences or {
            "genres": [],
            "authors": [],
            "languages": [],
        }
        analysis_prompt = self._build_analysis_prompt(missing_books, user_preferences)

        ai_response = await self.adapter.analyze_books(
            analysis_prompt, temperature=0.0
        )  # force determinism
        missing_scores = self._parse_analysis_response(ai_response, missing_books)

        # Cache only the new ones
        req_for_missing = BookAnalysisRequest(
            device_id=request.device_id,
            books=missing_books,
            user_preferences=user_preferences,
        )
        await self._cache_recommendations(db, req_for_missing, missing_scores)

        # Merge back in original order
        merged_map = dict(cached_map)
        for b, s in zip(missing_books, missing_scores):
            merged_map[_key_from_book(b)] = s
        book_scores = [
            merged_map.get(_key_from_book(b))
            for b in request.books
            if _norm(b.get("title"))
        ]
        # fallback if any None slipped in
        book_scores = [s for s in book_scores if s is not None]

        analysis_summary = {
            "perfect_matches": sum(1 for s in book_scores if s.is_perfect_match),
            "average_score": (
                sum(s.score for s in book_scores) / len(book_scores)
                if book_scores
                else 0
            ),
            "highest_score": max((s.score for s in book_scores), default=0),
        }
        return BookAnalysisResponse(
            success=True,
            total_books_analyzed=len(request.books),
            book_scores=book_scores,
            analysis_summary=analysis_summary,
            cached=bool(cached_map),
            cache_hit_count=len(cached_map),
        )

    def _build_analysis_prompt(
        self, books: List[Dict[str, Any]], preferences: Dict[str, Any]
    ) -> str:
        """Build a prompt for analyzing books against user preferences."""
        books_text = ""
        for i, book in enumerate(books, 1):
            title = book.get("title", "Unknown Title")
            author = book.get("author", "Unknown Author")
            subjects = book.get("subjects", []) or []
            year = book.get("year", "Unknown Year")
            publisher = book.get("publisher", "Unknown Publisher")

            books_text += f'{i}. "{title}" by {author}'
            if subjects:
                books_text += f" (Genres: {', '.join(subjects)})"
            if year != "Unknown Year":
                books_text += f" ({year})"
            books_text += f" - {publisher}\n"

        genres_text = ", ".join(preferences.get("genres", [])) or "No specific genres"
        authors_text = (
            ", ".join(preferences.get("authors", [])) or "No specific authors"
        )
        languages_text = (
            ", ".join(preferences.get("languages", [])) or "No specific languages"
        )

        prompt = f"""You are an expert book recommendation AI. Analyze each book below against the user's preferences and provide detailed scoring and recommendations.

USER PREFERENCES:
- Favorite Genres: {genres_text}
- Favorite Authors: {authors_text}
- Preferred Languages: {languages_text}

BOOKS TO ANALYZE:
{books_text}

For each book, provide:
1. A compatibility score from 0-10 (10 = perfect match)
2. A personalized recommendation (1-2 sentences)
3. Match quality: perfect/good/fair/poor
4. Detailed reasoning for the score

Format your response as JSON with this structure:
{{
  "book_analyses": [
    {{
      "book_index": 1,
      "title": "Book Title",
      "author": "Author Name",
      "score": 8.5,
      "recommendation": "This book perfectly matches your love for science fiction...",
      "match_quality": "perfect",
      "reasoning": "Detailed explanation of why this score was given..."
    }}
  ]
}}

Be creative and insightful in your analysis. Consider genre alignment, author preferences, writing style, themes, and how well each book would fit the user's reading taste."""
        return prompt

    def _parse_analysis_response(
        self, ai_response: str, original_books: List[Dict[str, Any]]
    ) -> List[BookScore]:
        """Parse AI response and create BookScore objects. Ensures ALL books are included."""
        book_scores: List[BookScore] = []
        analyzed_indices = set()  # Track which books were successfully analyzed by AI

        try:
            # Try direct JSON first
            try:
                response_data = json.loads(ai_response)
            except json.JSONDecodeError:
                # Fallback to extract first JSON object in text
                m = re.search(r"\{.*\}", ai_response, re.DOTALL)
                response_data = json.loads(m.group()) if m else {}

            analyses = response_data.get("book_analyses", [])
            for analysis in analyses:
                idx = int(analysis.get("book_index", 1)) - 1
                if 0 <= idx < len(original_books):
                    original_book = original_books[idx]
                    score_val = _coerce_score(analysis.get("score", 5.0))
                    book_scores.append(
                        BookScore(
                            title=analysis.get(
                                "title", original_book.get("title", "Unknown")
                            ),
                            author=analysis.get("author", original_book.get("author")),
                            cover_url=original_book.get("cover_url"),
                            score=score_val,
                            recommendation=analysis.get(
                                "recommendation", "This book might interest you."
                            ),
                            match_quality=analysis.get("match_quality", "fair"),
                            is_perfect_match=score_val >= 8.0,
                            reasoning=analysis.get(
                                "reasoning", "Analysis based on your preferences."
                            ),
                        )
                    )
                    analyzed_indices.add(idx)

            # Ensure ALL books are included - add fallback scores for any missing books
            for i, book in enumerate(original_books):
                if i not in analyzed_indices:
                    logger.warning(
                        f"Book {i+1} ('{book.get('title', 'Unknown')}') was not analyzed by AI, adding fallback score"
                    )
                    book_scores.append(
                        BookScore(
                            title=book.get("title", "Unknown"),
                            author=book.get("author"),
                            cover_url=book.get("cover_url"),
                            score=5.0,  # Default neutral score
                            recommendation="This book was included in the analysis but detailed AI scoring was not available.",
                            match_quality="fair",
                            is_perfect_match=False,
                            reasoning="Fallback analysis - AI did not provide detailed scoring for this book.",
                        )
                    )

            if not book_scores:
                raise ValueError("No analyses parsed and no fallback scores created")

        except Exception as e:
            logger.warning(f"Falling back due to parse error: {e}")
            # Complete fallback - create scores for all books
            for book in original_books:
                book_scores.append(
                    BookScore(
                        title=book.get("title", "Unknown"),
                        author=book.get("author"),
                        cover_url=book.get("cover_url"),
                        score=5.0,
                        recommendation="This book was analyzed but detailed scoring failed.",
                        match_quality="fair",
                        is_perfect_match=False,
                        reasoning="Fallback analysis due to parsing error.",
                    )
                )

        logger.info(
            f"Created {len(book_scores)} book scores for {len(original_books)} input books"
        )
        return book_scores

    async def _get_cached_map(
        self, db: AsyncSession, request: BookAnalysisRequest
    ) -> Dict[tuple[str, str], BookScore]:
        """Get cached recommendations as a map keyed by (title, author)."""
        keys = [_key_from_book(b) for b in request.books if _norm(b.get("title"))]
        if not keys:
            return {}

        stmt = (
            select(Recommendation)
            .join(Recommendation.book)
            .where(
                Recommendation.device_id == request.device_id,
                tuple_(Book.title, Book.author).in_(keys),
            )
            .options(selectinload(Recommendation.book))
        )

        result = await db.execute(stmt)
        cached: Dict[tuple[str, str], BookScore] = {}

        for rec in result.scalars():
            key = (_norm(rec.book.title), _norm(rec.book.author))
            is_perfect = (
                rec.is_perfect_match
                if isinstance(rec.is_perfect_match, bool)
                else str(rec.is_perfect_match).lower() in {"true", "1", "yes"}
            )
            cached[key] = BookScore(
                title=rec.book.title,
                author=rec.book.author,
                cover_url=rec.book.cover_url,
                score=rec.score,
                recommendation=rec.recommendation_text,
                match_quality=rec.match_quality,
                is_perfect_match=is_perfect,
                reasoning=rec.reasoning,
            )

        return cached

    async def _ensure_device_exists(self, db: AsyncSession, device_id: str) -> None:
        """Ensure device exists in database; create if not."""
        import uuid

        try:
            did = uuid.UUID(str(device_id))
        except Exception:
            logger.warning("Invalid device_id, generating one")
            did = uuid.uuid4()

        result = await db.execute(select(Device).where(Device.id == did))
        device = result.scalar_one_or_none()

        if not device:
            db.add(Device(id=did))
            await db.flush()
            logger.info(f"Created new device: {did}")

    async def _cache_recommendations(
        self,
        db: AsyncSession,
        request: BookAnalysisRequest,
        book_scores: List[BookScore],
    ) -> None:
        """Cache the generated recommendations in the database."""
        try:
            await self._ensure_device_exists(db, request.device_id)
            req_map = {_key_from_book(b): b for b in request.books}

            for score in book_scores:
                key = (_norm(score.title), _norm(score.author))
                book_data = req_map.get(
                    key, {"title": score.title, "author": score.author}
                )

                # find/create Book
                book_stmt = select(Book).where(
                    and_(
                        Book.title == _norm(book_data.get("title", "")),
                        Book.author == _norm(book_data.get("author", "")),
                    )
                )
                book = (await db.execute(book_stmt)).scalar_one_or_none()

                if not book:
                    book = Book(
                        title=_norm(book_data.get("title", "")),
                        author=_norm(book_data.get("author", "")),
                        isbn=book_data.get("isbn"),
                        cover_url=book_data.get("cover_url"),
                        fingerprint=f"{_norm(book_data.get('title',''))}|{_norm(book_data.get('author',''))}",
                    )
                    db.add(book)
                    await db.flush()

                # upsert Recommendation
                rec_q = select(Recommendation).where(
                    and_(
                        Recommendation.book_id == book.id,
                        Recommendation.device_id == request.device_id,
                    )
                )
                existing = (await db.execute(rec_q)).scalar_one_or_none()

                if existing:
                    existing.score = score.score
                    existing.recommendation_text = score.recommendation
                    existing.match_quality = score.match_quality
                    existing.is_perfect_match = str(bool(score.is_perfect_match))
                    existing.reasoning = score.reasoning
                else:
                    db.add(
                        Recommendation(
                            book_id=book.id,
                            device_id=request.device_id,
                            score=score.score,
                            recommendation_text=score.recommendation,
                            match_quality=score.match_quality,
                            is_perfect_match=str(bool(score.is_perfect_match)),
                            reasoning=score.reasoning,
                        )
                    )

                db.add(
                    History(
                        device_id=request.device_id,
                        book_id=book.id,
                        action=ActionEnum.recommended,
                    )
                )

            await db.commit()
        except Exception:
            await db.rollback()
            raise
