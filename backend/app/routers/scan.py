import logging

from app.config import settings
from app.db.models import Preference
from app.deps import device_id, get_db, rate_limit_dep
from app.services.books_meta_service import BooksMetaService
from app.services.vision import VisionService
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import (HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                              HTTP_415_UNSUPPORTED_MEDIA_TYPE)

router = APIRouter(tags=["scan"])
_service = VisionService()
_meta_service = BooksMetaService()

logger = logging.getLogger(__name__)

ALLOWED = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = int(settings.MAX_UPLOAD_MB) * 1024 * 1024


async def get_groq_enabled_preference(db: AsyncSession, device_id: str) -> bool:
    """Get the Groq enabled preference for the device, defaulting to True"""
    try:
        result = await db.execute(
            select(Preference.value_json).where(
                Preference.device_id == device_id, Preference.key == "groqEnabled"
            )
        )
        value = result.scalar_one_or_none()
        if value is not None:
            return bool(value)
    except Exception as e:
        logger.warning(f"Failed to get groq_enabled preference: {e}")

    # Default to True if not set or error
    return True


@router.post("/scan", dependencies=[Depends(rate_limit_dep())])
async def scan(
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    did: str = Depends(device_id),
):
    """
    Comprehensive book scanning endpoint that:
    1. Detects ALL books in the image
    2. Parses titles and authors from OCR text
    3. Enriches with metadata (covers, publication info)
    4. Returns complete book information
    """
    logger.info(
        f"Received file with content_type: '{image.content_type}', filename: '{image.filename}'"
    )

    # Check content type or file extension for WebP files
    is_webp = image.content_type == "image/webp" or (
        image.filename and image.filename.lower().endswith(".webp")
    )
    is_allowed = (
        image.content_type in ALLOWED
        or is_webp
        or image.content_type == "application/octet-stream"
        and image.filename
        and image.filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    )

    if not is_allowed:
        logger.error(
            f"Content type '{image.content_type}' not in allowed types: {ALLOWED}"
        )
        raise HTTPException(
            HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only JPEG/PNG/WebP are allowed"
        )

    blob = await image.read()
    if len(blob) > MAX_BYTES:
        raise HTTPException(
            HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Max upload is {settings.MAX_UPLOAD_MB} MB",
        )

    try:
        logger.info(f"Starting comprehensive book scan for device {did}")

        # Get Groq enabled preference
        groq_enabled = await get_groq_enabled_preference(db, did)
        logger.info(f"Groq enabled preference: {groq_enabled}")

        # Step 1: Detect books using vision service
        vision_result, provider_used = await _service.scan(
            blob, groq_enabled=groq_enabled
        )
        logger.info(
            f"Vision service detected {len(vision_result.spines)} text regions using {provider_used}"
        )

        # Step 2: Process each detected book
        detected_books = []

        for spine in vision_result.spines:
            if not spine.text or not spine.text.strip():
                continue

            try:
                #  title/author parsing
                text = spine.text.strip()
                title = text
                author = None

                #  "by" keyword detection
                if " by " in text.lower():
                    parts = text.split(" by ", 1)
                    if len(parts) == 2:
                        title = parts[0].strip()
                        author = parts[1].strip()

                # Clean up title
                title = (
                    title.replace("Third Edition", "")
                    .replace("Second Edition", "")
                    .replace("First Edition", "")
                    .strip()
                )
                title = title.replace("  ", " ").strip()

                logger.info(
                    f"Processing detected text: '{text}' -> Title: '{title}', Author: '{author}'"
                )

                # Get metadata enrichment
                partial = {
                    "title": title,
                    "author": author or "",
                    "isbn": spine.candidate_isbn,
                }

                canonical_book = await _meta_service.enrich_one(partial)

                # Add to results
                detected_books.append(
                    {
                        "title": canonical_book.title if canonical_book else title,
                        "author": canonical_book.author if canonical_book else author,
                        "cover_url": (
                            canonical_book.cover_url if canonical_book else None
                        ),
                        "year": canonical_book.year if canonical_book else None,
                        "publisher": (
                            canonical_book.publisher if canonical_book else None
                        ),
                        "subjects": canonical_book.subjects if canonical_book else None,
                        "isbn": (
                            canonical_book.isbn
                            if canonical_book
                            else spine.candidate_isbn
                        ),
                        "original_text": text,
                        "bbox": (
                            {
                                "x": spine.bbox.x,
                                "y": spine.bbox.y,
                                "w": spine.bbox.w,
                                "h": spine.bbox.h,
                            }
                            if spine.bbox
                            else None
                        ),
                    }
                )

                if canonical_book:
                    logger.info(f"Successfully enriched: {canonical_book.title}")
                else:
                    logger.info(f"No metadata found, using parsed data: {title}")

            except Exception as e:
                logger.error(f"Failed to process book text '{spine.text}': {e}")
                continue

        logger.info(
            f"Successfully processed {len(detected_books)} books from {len(vision_result.spines)} text regions"
        )

        # Post-processing: Filter out books with no proper title, author, and publisher
        enriched_books = []
        for book in detected_books:
            # Check if book has at least one of: title, author, or publisher
            has_proper_info = (
                (book.get("title") and book.get("title").strip())
                or (book.get("author") and book.get("author").strip())
                or (book.get("publisher") and book.get("publisher").strip())
            )

            if has_proper_info:
                enriched_books.append(book)
                logger.info(
                    f"Keeping book with proper info: {book['title']} by {book['author']} ({book['publisher']})"
                )
            else:
                logger.info(
                    f"Filtering out book with missing info: {book.get('title', 'No title')} by {book.get('author', 'No author')} ({book.get('publisher', 'No publisher')})"
                )

        logger.info(
            f"Post-processing: {len(detected_books)} -> {len(enriched_books)} books after filtering"
        )

        return {
            "success": True,
            "total_text_regions": len(vision_result.spines),
            "books_detected": len(enriched_books),
            "books": enriched_books,
            "model_used": provider_used,
        }

    except Exception as e:
        logger.error(f"Error in comprehensive scan: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to scan image: {str(e)}")
