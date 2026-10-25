import base64
import json
from typing import Any, Dict, Tuple

from fastapi import HTTPException
from groq import Groq

from ..config import settings
from ..services.types import SpineResult

# Short, title-focused output keeps a full shelf well under Groq's free-tier
# output limit (1000 tokens/min) and gives the metadata lookup clean queries.
PROMPT = (
    "You read photos of bookshelves and book stacks and list every distinct physical book.\n\n"
    "Rules:\n"
    "- One entry per physical book (spine or cover). Never list the same book twice.\n"
    "- Read spines in any orientation and in any language or script.\n"
    "- text: the book's full title, then ' by ' and the author if the author is visible "
    "(example: \"The Tipping Point by Malcolm Gladwell\"). Include every word of the title even "
    "when part of it is printed much smaller (\"The 33 Strategies of War\", not \"War\"). "
    "Leave out subtitles, taglines, "
    "edition notes, publisher names and sales claims such as 'bestseller'.\n"
    "- Copy words as printed; do not guess words you cannot read. Skip a book if no title is readable.\n"
    "- candidate_isbn: digits only if an ISBN is printed, otherwise null.\n"
    "- Order top-to-bottom, then left-to-right. Ignore objects that are not books "
    "and newspaper or magazine mastheads.\n\n"
    "Return only JSON in exactly this shape:\n"
    '{"spines":[{"text":"The Tipping Point by Malcolm Gladwell","candidate_isbn":null}]}\n'
    'If there are no readable books, return {"spines":[]}.'
)

# Free tier caps output at 1000 tokens per minute per model
MAX_OUTPUT_TOKENS = 1000

MODEL_ID = getattr(settings, "GROQ_VISION_MODEL", "qwen/qwen3.8-27b")


def reasoning_options(model: str, effort: str) -> Dict[str, Any] | None:
    """Reasoning models spend output tokens on hidden thinking; keep it small.

    Qwen 3 accepts "none"; gpt-oss accepts low/medium/high. Other models reject the field.
    """
    if "qwen3" in model:
        return {"reasoning_effort": effort}
    if "gpt-oss" in model:
        return {"reasoning_effort": "low" if effort == "none" else effort}
    return None


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
                max_tokens=MAX_OUTPUT_TOKENS,
                extra_body=reasoning_options(MODEL_ID, "none"),
            )
        except Exception as e:
            # surface as HTTP 502-ish to trigger fallback above us
            raise HTTPException(
                status_code=502, detail=f"groq_error:{e.__class__.__name__}:{e}"
            )

        usage = getattr(resp, "usage", None)
        # Parse JSON
        try:
            payload = resp.choices[0].message.content
            data = json.loads(payload)
            result = SpineResult.parse_obj(data)
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"groq_parse_error:{e.__class__.__name__}:{e}",
            )

        # usage may include token counts; we pass it up for logging
        return result, (usage.to_dict() if hasattr(usage, "to_dict") else (usage or {}))
