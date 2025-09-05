import base64
import json
import traceback
from typing import Any, Dict, Tuple

from fastapi import HTTPException
from groq import Groq

from ..config import settings
from ..services.types import SpineResult

PROMPT = (
    "You are a bookshelf OCR system. Detect visible book spines in the photo. "
    "For each spine, extract readable text (title/author/ISBN if present). "
    "If you can estimate a tight bounding box around the spine, include it. "
    "Return ONLY strict JSON with this schema:\n"
    '{ "spines":[ { "text": "…", "candidate_isbn": "…", '
    '"bbox": {"x":0,"y":0,"w":0,"h":0} | null } ] }'
)

MODEL_ID = getattr(
    settings, "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)


class GroqVisionAdapter:
    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY missing")
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    async def scan(self, image_bytes: bytes) -> Tuple[SpineResult, Dict[str, Any]]:
        # (Optional) you could downscale/encode to keep < 4MB base64 if needed.
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        content = [
            {"type": "text", "text": PROMPT},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
            },
        ]
        try:
            resp = self.client.chat.completions.create(
                model=MODEL_ID,
                messages=[{"role": "user", "content": content}],
                response_format={"type": "json_object"},  # ask for strict JSON
                temperature=0,
            )
        except Exception as e:
            # surface as HTTP 502-ish to trigger fallback above us
            error_detail = (
                f"groq_error:{e.__class__.__name__}:{str(e)}:{traceback.format_exc()}"
            )
            raise HTTPException(status_code=502, detail=error_detail)

        usage = getattr(resp, "usage", None)
        # Parse JSON
        try:
            payload = resp.choices[0].message.content
            data = json.loads(payload)
            result = SpineResult.parse_obj(data)
        except Exception as e:
            raise HTTPException(
                status_code=502, detail=f"groq_parse_error:{e.__class__.__name__}"
            )

        # usage may include token counts; we pass it up for logging
        return result, (usage.to_dict() if hasattr(usage, "to_dict") else (usage or {}))
