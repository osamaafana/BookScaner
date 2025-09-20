import logging
from typing import Any, Dict

from app.deps import device_id, get_db, rate_limit_dep
from app.services.recs_service import RecsService
from app.services.types import BookAnalysisRequest
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_400_BAD_REQUEST

logger = logging.getLogger(__name__)

router = APIRouter(tags=["recommend"])
_service = RecsService()


@router.post("/recommend", dependencies=[Depends(rate_limit_dep())])
async def analyze_books(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    did: str = Depends(device_id),
):
    """
    Analyze a list of books against user preferences using AI with high temperature.
    Returns scores and recommendations for each book.
    """
    try:
        # Validate payload
        books = payload.get("books", [])
        if not books or not isinstance(books, list):
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail="Payload must contain a 'books' array",
            )

        # Extract user preferences (optional)
        user_preferences = payload.get("user_preferences", {})

        # Create analysis request
        request = BookAnalysisRequest(
            device_id=did, books=books, user_preferences=user_preferences
        )

        logger.info(f"Analyzing {len(books)} books for device {did}")

        # Get AI analysis with high temperature (now returns BookAnalysisResponse)
        response = await _service.analyze_books_with_preferences(db, request)

        # Sort by score (highest first)
        response.book_scores.sort(key=lambda x: x.score, reverse=True)

        logger.info(
            f"Generated {len(response.book_scores)} book scores (cached: {response.cached})"
        )

        return response.dict()

    except Exception as e:
        logger.error(f"Error analyzing books: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to analyze books: {str(e)}"
        )
