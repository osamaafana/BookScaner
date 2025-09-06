from app.config import settings
from app.deps import rate_limit_dep
from app.services.types import BBoxOut, SpineOut
from app.services.vision import VisionService
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from starlette.status import (HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                              HTTP_415_UNSUPPORTED_MEDIA_TYPE)

router = APIRouter(tags=["scan"])
_service = VisionService()

ALLOWED = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = int(settings.MAX_UPLOAD_MB) * 1024 * 1024


@router.post("/scan", dependencies=[Depends(rate_limit_dep())])
async def scan(image: UploadFile = File(...)):
    if image.content_type not in ALLOWED:
        raise HTTPException(
            HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only JPEG/PNG/WebP are allowed"
        )
    blob = await image.read()
    if len(blob) > MAX_BYTES:
        raise HTTPException(
            HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Max upload is {settings.MAX_UPLOAD_MB} MB",
        )
    res = await _service.scan(blob)
    items: list[SpineOut] = []
    for s in res.spines:
        bbox = None
        if getattr(s, "bbox", None):
            bbox = BBoxOut(x=s.bbox.x, y=s.bbox.y, w=s.bbox.w, h=s.bbox.h)
        cands = []
        if getattr(s, "candidate_isbn", None):
            cands.append(s.candidate_isbn)
        items.append(SpineOut(bbox=bbox, text=s.text or "", candidates=cands))
    return items
