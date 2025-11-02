"""
Image Security Service
Handles image validation, EXIF stripping, and security checks
"""

import hashlib
import io
import logging
from typing import Optional, Tuple

from PIL import Image

logger = logging.getLogger(__name__)

# Magic bytes for common image formats
MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",  # WebP starts with RIFF
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"BM": "image/bmp",
    b"II*\x00": "image/tiff",  # Little-endian TIFF
    b"MM\x00*": "image/tiff",  # Big-endian TIFF
}

ALLOWED_FORMATS = {"image/jpeg", "image/png", "image/webp"}


class ImageSecurityError(Exception):
    """Custom exception for image security violations"""

    pass


def verify_magic_bytes(image_bytes: bytes) -> Tuple[bool, Optional[str]]:
    """
    Verify image magic bytes to ensure file type matches content.
    Returns (is_valid, detected_mime_type)
    """
    if len(image_bytes) < 12:
        return False, None

    # Check magic bytes
    for magic, mime_type in MAGIC_BYTES.items():
        if image_bytes.startswith(magic):
            # Special handling for WebP (RIFF format)
            if mime_type == "image/webp" and len(image_bytes) >= 12:
                if image_bytes[8:12] == b"WEBP":
                    return mime_type in ALLOWED_FORMATS, mime_type
                continue
            return mime_type in ALLOWED_FORMATS, mime_type

    return False, None


def strip_exif_data(image_bytes: bytes) -> bytes:
    """
    Strip EXIF data from image for privacy and security.
    Returns cleaned image bytes.
    """
    try:
        # Open image
        img = Image.open(io.BytesIO(image_bytes))

        # Create new image without EXIF
        output = io.BytesIO()

        # Determine format
        format_map = {"JPEG": "JPEG", "PNG": "PNG", "WEBP": "WEBP"}

        img_format = format_map.get(img.format, "JPEG")

        # Save without EXIF data
        if img_format == "JPEG":
            img.save(output, format=img_format, quality=85, optimize=True, exif=b"")
        else:
            img.save(output, format=img_format, optimize=True)

        cleaned_bytes = output.getvalue()

        # Log EXIF removal
        original_size = len(image_bytes)
        cleaned_size = len(cleaned_bytes)
        if original_size != cleaned_size:
            logger.info(f"EXIF data removed: {original_size} -> {cleaned_size} bytes")

        return cleaned_bytes

    except Exception as e:
        logger.error(f"Failed to strip EXIF data: {e}")
        raise ImageSecurityError(f"EXIF stripping failed: {e}")


def validate_and_clean_image(
    image_bytes: bytes,
    max_size_mb: int = 10,
    max_dimension: int = 4096,
    min_dimension: int = 100,
) -> bytes:
    """
    Comprehensive image validation and cleaning:
    1. Verify magic bytes
    2. Strip EXIF data
    3. Validate size and dimensions
    4. Re-encode for security

    Returns cleaned image bytes
    """
    # Size check
    max_bytes = max_size_mb * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise ImageSecurityError(
            f"Image too large: {len(image_bytes)} bytes > {max_bytes} bytes"
        )

    # Magic bytes verification
    is_valid, mime_type = verify_magic_bytes(image_bytes)
    if not is_valid:
        raise ImageSecurityError(
            f"Invalid image format or magic bytes. Detected: {mime_type}"
        )

    # Dimension validation
    try:
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size

        if width > max_dimension or height > max_dimension:
            raise ImageSecurityError(
                f"Image dimensions too large: {width}x{height} > {max_dimension}x{max_dimension}"
            )

        if width < min_dimension or height < min_dimension:
            raise ImageSecurityError(
                f"Image dimensions too small: {width}x{height} < {min_dimension}x{min_dimension}"
            )

        logger.info(f"Image dimensions validated: {width}x{height}")

    except Exception as e:
        if isinstance(e, ImageSecurityError):
            raise
        raise ImageSecurityError(f"Failed to validate image dimensions: {e}")

    logger.info(
        f"Image validation passed: {mime_type}, {len(image_bytes)} bytes, {width}x{height}"
    )

    # Strip EXIF data
    cleaned_bytes = strip_exif_data(image_bytes)

    # Generate hash for logging (first 8 chars for privacy)
    image_hash = hashlib.sha256(cleaned_bytes).hexdigest()[:8]
    logger.info(f"Image processed successfully: hash={image_hash}")

    return cleaned_bytes
