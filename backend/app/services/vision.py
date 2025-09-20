import base64
import hashlib
import io
import logging
from typing import Tuple

from PIL import Image

from ..adapters.google_vision import GoogleVisionAdapter
from ..adapters.groq_vision import GroqVisionAdapter
from ..cache.helpers import SCAN_TTL, cache_get, cache_set, scan_key
from ..services.cost_guard import record_spend
from ..services.metrics import (VisionMetrics, record_cache_hit,
                                record_image_processing, record_vision_spend)
from ..services.types import SpineResult

logger = logging.getLogger(__name__)


def _sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _downscale_image_if_needed(image_bytes: bytes, max_size_mb: float = 3.5) -> bytes:
    """
    Downscale image if base64 payload would exceed max_size_mb.
    Groq has ~4MB limit, so we target 3.5MB to be safe.
    """
    # Check if current size is acceptable
    b64_size_mb = len(base64.b64encode(image_bytes)) / (1024 * 1024)

    # Record original image size
    record_image_processing("received", len(image_bytes))

    if b64_size_mb <= max_size_mb:
        logger.info(f"Image size OK: {b64_size_mb:.1f}MB (under {max_size_mb}MB limit)")
        record_image_processing("kept_original", len(image_bytes))
        return image_bytes

    logger.info(f"Image too large: {b64_size_mb:.1f}MB, downscaling...")

    try:
        # Open image with PIL
        img = Image.open(io.BytesIO(image_bytes))

        # Calculate scale factor to reach target size
        # Rough estimate: base64 is ~1.33x larger than binary
        target_binary_mb = max_size_mb / 1.33
        current_binary_mb = len(image_bytes) / (1024 * 1024)
        scale_factor = (target_binary_mb / current_binary_mb) ** 0.5

        # Apply scale factor with minimum size constraints
        new_width = max(400, int(img.width * scale_factor))
        new_height = max(300, int(img.height * scale_factor))

        logger.info(
            f"Resizing from {img.width}x{img.height} to {new_width}x{new_height}"
        )

        # Resize with high quality
        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Convert back to bytes
        output_buffer = io.BytesIO()
        img_format = img.format or "JPEG"
        if img_format.upper() == "HEIF":
            img_format = "JPEG"  # Convert HEIF to JPEG

        img_resized.save(output_buffer, format=img_format, quality=85, optimize=True)
        resized_bytes = output_buffer.getvalue()

        final_b64_size_mb = len(base64.b64encode(resized_bytes)) / (1024 * 1024)
        logger.info(f"Downscaled to {final_b64_size_mb:.1f}MB")

        # Record downscaling metrics
        record_image_processing("downscaled", len(resized_bytes))
        if img_format == "JPEG" and img.format != "JPEG":
            record_image_processing("format_converted", len(resized_bytes))

        return resized_bytes

    except Exception as e:
        logger.warning(f"Failed to downscale image: {e}, using original")
        return image_bytes


class VisionService:
    def __init__(self):
        self.groq = GroqVisionAdapter()
        self.gcv = GoogleVisionAdapter()

    async def scan(
        self, image_bytes: bytes, groq_enabled: bool = True
    ) -> Tuple[SpineResult, str]:
        # Use original bytes for cache key to avoid cache misses on different scaled versions
        original_key = scan_key(_sha256(image_bytes), groq_enabled)
        cached = await cache_get(original_key)
        if cached:
            logger.info("Serving scan result from cache")
            record_cache_hit()
            # For cached results, we don't know which provider was used, so return "cached"
            return SpineResult.parse_obj(cached), "cached"

        # Downscale image if needed for Groq's base64 limits
        processed_image_bytes = _downscale_image_if_needed(image_bytes)

        # Try Groq first if enabled; on any error (incl. account blocked) fall back to GCV
        result = None
        provider_used = None

        if groq_enabled:
            try:
                logger.info("Attempting vision processing with Groq")
                with VisionMetrics("groq") as metrics:
                    result, usage = await self.groq.scan(processed_image_bytes)
                    spine_count = len(result.spines) if result.spines else 0
                    metrics.record_spines_detected(spine_count)

                provider_used = "groq"
                logger.info("✅ Groq vision processing successful")
                # Optional: derive cost estimate if you want, else record 0.0 and rely on Console limits
                await record_spend("groq", 0.0)
                record_vision_spend("groq", 0.0)

            except Exception as e:
                logger.warning(
                    f"❌ Groq vision failed: {e}, falling back to Google Vision"
                )
                # If Groq fails, fall back to Google Cloud Vision
                # Google Vision can handle larger images, so use original
                with VisionMetrics("gcv") as metrics:
                    result, usage = await self.gcv.scan(image_bytes)
                    spine_count = len(result.spines) if result.spines else 0
                    metrics.record_spines_detected(spine_count)

                provider_used = "gcv"
                logger.info("✅ Google Cloud Vision processing successful")
                await record_spend("gcv", 0.0)
                record_vision_spend("gcv", 0.0)
        else:
            logger.info("Groq disabled, using Google Vision directly")
            # Groq is disabled, use Google Cloud Vision directly
            # Google Vision can handle larger images, so use original
            with VisionMetrics("gcv") as metrics:
                result, usage = await self.gcv.scan(image_bytes)
                spine_count = len(result.spines) if result.spines else 0
                metrics.record_spines_detected(spine_count)

            provider_used = "gcv"
            logger.info("✅ Google Cloud Vision processing successful")
            await record_spend("gcv", 0.0)
            record_vision_spend("gcv", 0.0)

        # Log final result for observability
        spine_count = len(result.spines) if result.spines else 0
        logger.info(
            f"Vision scan complete: provider={provider_used}, spines_detected={spine_count}"
        )

        await cache_set(original_key, result.dict(), SCAN_TTL)
        return result, provider_used
