from typing import List

from app.config import settings
from app.services.types import Recommendation
from groq import Groq

MODEL = getattr(settings, "OLLAMA_RECS_MODEL", "llama-3.1-8b-instant")


class LlamaRecsAdapter:
    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY missing")
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    async def recommend(self, prompt: str) -> List[Recommendation]:
        # Use deterministic settings for stable cache hits
        resp = self.client.chat.completions.create(
            model=MODEL,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.choices[0].message.content or ""
        return self._parse_lines(text)

    def _parse_lines(self, text: str) -> List[Recommendation]:
        recs: List[Recommendation] = []
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            # Allow optional leading numbering: "1) Title | Author | reason"
            if ")" in line[:4]:
                line = line.split(")", 1)[1].strip()
            parts = [p.strip(" –-") for p in line.split("|")]
            if len(parts) >= 2:
                title = parts[0]
                author = parts[1] if parts[1] else None
                reason = parts[2] if len(parts) > 2 else None
                recs.append(
                    Recommendation(title=title, author=author, short_reason=reason)
                )
            if len(recs) == 6:
                break
        return recs
