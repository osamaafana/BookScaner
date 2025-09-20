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
    "You are a JSON-only response generator. Input: OCR fragments with text + bbox in [0,1]. "
    "Output: DISTINCT PHYSICAL BOOKS.\n\n"
    "CONTRACT:\n"
    'Return ONLY valid JSON: {"spines":[{"text":string,"candidate_isbn":null,'
    '"bbox":{"x":0.1234,"y":0.5678,"w":0.1111,"h":0.2222}}]}\n'
    'If none: {"spines":[]}.\n\n'
    "GROUPING:\n"
    "- ONE entry = ONE physical spine/cover.\n"
    "- Merge fragments that overlap or align on the same vertical strip.\n"
    "- Author names, subtitles, marketing badges belong to the SAME entry; never separate.\n"
    "- CRITICAL: If a fragment contains ONLY an author name (like 'Rudyard Kipling', 'A. A. Milne', 'P. L. Travers'), IGNORE it completely. These are not separate books.\n"
    "- If a spine lists multiple related titles (sequels/series list), return ONLY the base/main title "
    "(shortest shared-prefix title on that spine).\n"
    "- No duplicates.\n\n"
    "BBOX:\n"
    "- x=min(x_i), y=min(y_i), w=max(x_i)-min(x_i), h=max(y_i)-min(y_i).\n"
    "- Round to 4 decimals.\n\n"
    "QUALITY:\n"
    "- Maximize recall, minimize false positives. No invented text.\n"
    "- Sort by bbox.y then bbox.x.\n\n"
    "Respond with STRICT JSON only."
)


def build_user_prompt(candidates: List[Dict[str, Any]]) -> str:
    # Compact JSON so the model sees the exact inputs
    return json.dumps({"candidates": candidates}, separators=(",", ":"))


class NIMAdapter:
    def __init__(self):
        self.base_url = settings.NVIDIA_BASE_URL
        self.model = settings.NVIDIA_MODEL_NAME
        self.api_key = settings.NVIDIA_API_KEY
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
            "max_tokens": 2000,  # Increased max_tokens
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
                f"NVIDIA NIM HTTP error: {e.response.status_code} - {e.response.text}"
            )
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"nvidia_http_error:{e.response.text[:200]}",
            )
        except Exception as e:
            logger.error(f"NVIDIA NIM error: {e}")
            raise HTTPException(
                status_code=502, detail=f"nvidia_error:{e.__class__.__name__}:{str(e)}"
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
                spine = Spine(
                    text=spine_data["text"],
                    candidate_isbn=spine_data.get("candidate_isbn"),
                    bbox=spine_data.get("bbox"),
                )
                spines.append(spine)

            print(f"DEBUG: NVIDIA NIM - Successfully created {len(spines)} spines")
            return SpineResult(spines=spines)

        except (json.JSONDecodeError, ValidationError, KeyError, ValueError) as e:
            print(f"DEBUG: NVIDIA NIM - Parse error: {e}")
            print(f"DEBUG: NVIDIA NIM - Content that failed to parse: '{content}'")
            raise HTTPException(
                status_code=502, detail=f"nvidia_parse_error:{e.__class__.__name__}"
            )
