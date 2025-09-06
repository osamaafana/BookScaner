from typing import List, Tuple

from app.adapters.ollama_recs import LlamaRecsAdapter
from app.cache.helpers import RECS_TTL, cache_get, cache_set, recs_key
from app.db.models import Book, History, Preference
from app.services.books_hash import books_hash
from app.services.recs_prompt import build_prompt
from app.services.types import Recommendation, RecsPayload
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession


class RecsService:
    def __init__(self):
        self.adapter = LlamaRecsAdapter()
        self.ttl = 7 * 24 * 3600  # hard 7d per spec

    async def device_profile(
        self, db: AsyncSession, device_id: str
    ) -> Tuple[List[str], List[str]]:
        # genres from preferences (key='genres'), recent authors from history
        genres: List[str] = []
        q_p = await db.execute(
            select(Preference.value_json).where(
                Preference.device_id == device_id,
                Preference.key == "genres",
            )
        )
        row = q_p.first()
        if row and isinstance(row[0], list):
            genres = [str(x) for x in row[0]][:10]

        # top recent authors from saved history joined to books
        q_a = await db.execute(
            select(Book.author, func.count().label("c"))
            .join(History, History.book_id == Book.id)
            .where(History.device_id == device_id, History.action == "saved")
            .group_by(Book.author)
            .order_by(desc("c"))
            .limit(10)
        )
        authors = [a for (a, _) in q_a.all() if a][:10]
        return genres, authors

    async def shelf_titles(self, db: AsyncSession, saved_ids: List[int]) -> List[str]:
        if not saved_ids:
            return []
        q = await db.execute(
            select(Book.title).where(Book.id.in_(saved_ids)).limit(200)
        )
        return [t for (t,) in q.all() if t]

    async def recommend(
        self, db: AsyncSession, payload: RecsPayload
    ) -> List[Recommendation]:
        did = payload.device_id
        h = books_hash(payload.saved_book_ids)
        key = recs_key(did, h)

        # cache first
        cached = await cache_get(key)
        if cached:
            return [Recommendation(**r) for r in cached]

        # build compact prompt
        genres, authors = payload.top_genres, payload.top_authors
        if not genres or not authors:
            g2, a2 = await self.device_profile(db, did)
            genres = genres or g2
            authors = authors or a2
        titles = await self.shelf_titles(db, payload.saved_book_ids)
        prompt = build_prompt(genres, authors, titles)

        recs = await self.adapter.recommend(prompt)
        # best-effort filter: avoid self-recommendations (already owned)
        owned_titles = {t.lower().strip() for t in titles}
        recs = [r for r in recs if r.title.lower().strip() not in owned_titles][
            : payload.limit
        ]

        await cache_set(key, [r.dict() for r in recs], RECS_TTL)
        return recs
