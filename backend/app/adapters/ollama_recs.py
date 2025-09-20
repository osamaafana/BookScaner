from app.config import settings
from groq import Groq

MODEL = getattr(settings, "OLLAMA_RECS_MODEL", "llama-3.1-8b-instant")


class LlamaRecsAdapter:
    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY missing")
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    async def analyze_books(self, prompt: str, temperature: float = 0.8) -> str:
        """Analyze books with high temperature for creative scoring"""
        resp = self.client.chat.completions.create(
            model=MODEL,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content or ""
