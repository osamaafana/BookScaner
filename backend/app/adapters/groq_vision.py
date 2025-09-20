import base64
import json
import traceback
from typing import Any, Dict, Tuple

from fastapi import HTTPException
from groq import Groq

from ..config import settings
from ..services.types import SpineResult

PROMPT = (
    "You are an expert bookshelf scanner. This image contains MULTIPLE books arranged on shelves. "
    "Your task is to identify EVERY SINGLE BOOK you can see, no matter how small or partially visible.\n\n"
    "CRITICAL INSTRUCTIONS:\n"
    "- Scan for book spines arranged vertically AND horizontally; include stacked books.\n"
    "- One entry per book. Do not merge adjacent spines.\n"
    "- Use visual boundaries (gutters, edges, color/texture changes, logo breaks).\n"
    "- Include partially visible spines. If uncertain between one or two books, prefer two.\n"
    "- Do not miss books in corners or behind others.\n"
    "- Ignore non-book objects (decor, boxes, binders, magazines without spine text, DVDs).\n"
    "- If multiple spines/covers appear in a row, each is a SEPARATE book.\n"
    "- Each book must have its own entry even if very close to others.\n\n"
    "For EACH individual book, extract:\n"
    "1) ALL visible text from that specific spine/cover. Preserve case and punctuation. Use '?' for unclear characters. "
    "Join lines with single spaces. Any language/script allowed.\n"
    "2) Any ISBN numbers if visible. Detect ISBN-10 or ISBN-13. Normalize to digits only (no hyphens). If none, set null.\n"
    "3) Bounding box coordinates: axis-aligned, normalized to [0,1] relative to the full image, origin at top-left, four decimal places. "
    '"bbox": {"x": left, "y": top, "w": width, "h": height}.\n\n'
    "ORDERING:\n"
    "- Sort output by bbox.y, then bbox.x (top-to-bottom, then left-to-right).\n\n"
    "OUTPUT CONTRACT:\n"
    '- Return ONLY strict JSON with this exact shape. No comments or extra keys. If nothing found, return {"spines": []}.\n\n'
    "SCHEMA:\n"
    '{ "spines": [ { "text": string, "candidate_isbn": string|null, "bbox": {"x": number, "y": number, "w": number, "h": number} } ] }\n\n'
    "Return ONLY:\n"
    '{ "spines": [ { "text": "Sample text", "candidate_isbn": null, "bbox": {"x":0.1234,"y":0.0456,"w":0.0789,"h":0.6543} } ] }\n\n'
    "Remember: Maximize recall. No duplicates."
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
