from fastapi import APIRouter, File, HTTPException, UploadFile

from ..services.vision import VisionService

router = APIRouter(tags=["scan"])

_service = VisionService()


@router.post("/scan")
async def scan(image: UploadFile = File(...)):
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Unsupported media type")

    img_bytes = await image.read()
    res = await _service.scan(img_bytes)
    return res.dict()
