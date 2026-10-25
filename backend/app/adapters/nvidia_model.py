import json
import logging
from typing import Any, Dict, List

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from ..config import settings
from ..services.types import Spine, SpineResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You turn OCR fragments from a photo of books into a list of distinct physical books.\n\n"
    "Input: JSON {\"candidates\":[{\"text\":...,\"bbox\":{x,y,w,h}}]}; bbox values are 0-1 from the top-left.\n\n"
    "Grouping:\n"
    "- Fragments on the same spine or cover (overlapping or lined up along one strip) belong to ONE book.\n"
    "- An author name belongs to the book it sits on; never list an author on its own.\n"
    "- Drop taglines, subtitles, edition notes, publisher names and sales claims "
    "(\"bestseller\", \"over 15 million copies sold\").\n"
    "- Use only words that appear in the fragments; fix obvious OCR splits but do not invent titles.\n"
    "- Keep every word of a title, including small words printed above a large one "
    "(\"The 33 Strategies of War\", not \"War\").\n"
    "- No duplicates. Order top-to-bottom, then left-to-right.\n\n"
    "Output: only JSON, no prose, in exactly this shape:\n"
    '{"spines":[{"text":"Think and Grow Rich by Napoleon Hill","candidate_isbn":null}]}\n'
    "text = title, then ' by ' and the author when an author fragment is present. "
    "candidate_isbn = digits of a printed ISBN, else null. "
    'If no book can be identified, return {"spines":[]}.'
)


def build_user_prompt(candidates: List[Dict[str, Any]]) -> str:
    # Compact JSON; 3-decimal boxes halve the input tokens (Groq free tier: 7000/min)
    compact = []
    for c in candidates:
        item: Dict[str, Any] = {"text": c.get("text", "")}
        box = c.get("bbox")
        if box:
            item["bbox"] = {k: round(float(v), 3) for k, v in box.items()}
        compact.append(item)
    return json.dumps({"candidates": compact}, separators=(",", ":"))


class NIMAdapter:
    """OCR-fragment grouper on any OpenAI-compatible chat API.

    Defaults to NVIDIA NIM; `groq_grouper()` builds the same adapter on Groq
    as the fallback when NVIDIA is unavailable.
    """

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        api_key: str | None = None,
        max_tokens: int = 2000,
        extra: Dict[str, Any] | None = None,
        name: str = "NVIDIA NIM",
    ):
        self.base_url = (base_url or settings.NVIDIA_BASE_URL).rstrip("/")
        self.model = model or settings.NVIDIA_MODEL_NAME
        self.api_key = settings.NVIDIA_API_KEY if api_key is None else api_key
        self.max_tokens = max_tokens
        self.extra = extra or {}
        self.name = name
        self.headers = (
            {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            if self.api_key
            else {}
        )
        self.timeout = 60

    async def aggregate(self, candidates: List[Dict[str, Any]]) -> SpineResult:
        """Aggregate OCR text snippets into structured book spines using NVIDIA NIM"""
        print(
            f"DEBUG: NVIDIA NIM - Starting aggregation with {len(candidates)} candidates"
        )
        print(f"DEBUG: NVIDIA NIM - API Key present: {bool(self.api_key)}")
        print(f"DEBUG: NVIDIA NIM - Base URL: {self.base_url}")
        print(f"DEBUG: NVIDIA NIM - Model: {self.model}")

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(candidates)},
            ],
            "temperature": 0,
            "max_tokens": self.max_tokens,
            **self.extra,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    json=payload,
                    headers=self.headers,
                )
                r.raise_for_status()
                data = r.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                f"{self.name} HTTP error: {e.response.status_code} - {e.response.text[:300]}"
            )
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"{self.name} HTTP {e.response.status_code}: {e.response.text[:200]}",
            )
        except Exception as e:
            logger.error(f"{self.name} error: {e.__class__.__name__}: {e}")
            raise HTTPException(
                status_code=502, detail=f"{self.name} error: {e.__class__.__name__}: {e}"
            )

        # Parse OpenAI-compatible NIM response
        try:
            message = data["choices"][0]["message"]
            content = message.get("content", "")
            reasoning_content = message.get("reasoning_content", "")

            print(f"DEBUG: NVIDIA NIM - Content field: '{content}'")
            print(
                f"DEBUG: NVIDIA NIM - Reasoning content length: {len(reasoning_content)}"
            )

            # If content is empty but reasoning_content has data, extract JSON from reasoning
            if not content and reasoning_content:
                print(
                    "DEBUG: NVIDIA NIM - Content is empty, extracting from reasoning_content"
                )
                content = reasoning_content

            print(f"DEBUG: NVIDIA NIM - Raw content for parsing: '{content}'")

            if not content:
                raise ValueError("No content found in response")

            # Extract JSON from markdown code blocks if present
            if "```" in content:
                # Find the JSON between code blocks
                start = content.find("```")
                if start != -1:
                    # Find the next ``` after the first one
                    end = content.find("```", start + 3)
                    if end != -1:
                        content = content[start + 3 : end].strip()
                        print(
                            f"DEBUG: NVIDIA NIM - Extracted JSON from code blocks: '{content}'"
                        )

            # Remove "json" prefix if present
            if content.startswith("json"):
                content = content[4:].strip()
                print(f"DEBUG: NVIDIA NIM - Removed 'json' prefix: '{content}'")

            parsed = json.loads(content)
            print(f"DEBUG: NVIDIA NIM - Parsed JSON: {parsed}")

            # Convert to SpineResult format
            spines = []
            for spine_data in parsed.get("spines", []):
                text = (spine_data.get("text") or "").strip()
                if not text:
                    continue
                spine = Spine(text=text, candidate_isbn=spine_data.get("candidate_isbn"))
                spines.append(spine)

            print(f"DEBUG: NVIDIA NIM - Successfully created {len(spines)} spines")
            return SpineResult(spines=spines)

        except (json.JSONDecodeError, ValidationError, KeyError, ValueError) as e:
            print(f"DEBUG: NVIDIA NIM - Parse error: {e}")
            print(f"DEBUG: NVIDIA NIM - Content that failed to parse: '{content}'")
            raise HTTPException(
                status_code=502, detail=f"{self.name} parse error: {e.__class__.__name__}: {e}"
            )


def groq_grouper() -> "NIMAdapter":
    """Same grouping step on Groq's text model (free tier: 1000 output tokens/min)."""
    from .groq_vision import reasoning_options

    model = settings.GROQ_TEXT_MODEL
    return NIMAdapter(
        base_url="https://api.groq.com/openai",
        model=model,
        api_key=settings.GROQ_API_KEY,
        max_tokens=1000,
        extra={
            "response_format": {"type": "json_object"},
            **(reasoning_options(model, "none") or {}),
        },
        name="Groq grouper",
    )
