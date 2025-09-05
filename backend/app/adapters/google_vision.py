import base64
from typing import Any, Dict, Tuple

import httpx
from fastapi import HTTPException

from ..config import settings
from ..services.types import Spine, SpineResult

API = "https://vision.googleapis.com/v1/images:annotate"


class GoogleVisionAdapter:
    def __init__(self):
        if not settings.GOOGLEBOOKS_API_KEY and not settings.GOOGLE_VISION_API_KEY:
            # support either GOOGLE_VISION_API_KEY or legacy var
            print(
                "Warning: GOOGLE_VISION_API_KEY missing - Google Vision will not work"
            )
            self.key = None
        else:
            self.key = settings.GOOGLE_VISION_API_KEY or settings.GOOGLEBOOKS_API_KEY

    async def scan(self, image_bytes: bytes) -> Tuple[SpineResult, Dict[str, Any]]:
        if not self.key:
            raise HTTPException(
                status_code=503, detail="Google Vision API key not configured"
            )

        b64 = base64.b64encode(image_bytes).decode("utf-8")
        body = {
            "requests": [
                {
                    "image": {"content": b64},
                    "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                }
            ]
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(f"{API}?key={self.key}", json=body)
                r.raise_for_status()
                data = r.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"gcv_http:{e.response.text[:200]}",
            )
        except Exception as e:
            raise HTTPException(
                status_code=502, detail=f"gcv_error:{e.__class__.__name__}"
            )

        try:
            ann = data["responses"][0]
            full = ann.get("fullTextAnnotation") or {}
            text = full.get("text") or ""
            if not text:
                # fallback to sparse textAnnotations
                tanns = ann.get("textAnnotations") or []
                text = tanns[0]["description"] if tanns else ""
        except Exception:
            text = ""

        return SpineResult(spines=[Spine(text=text or "")]), {"gcv_units": 1}
