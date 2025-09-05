from typing import Any, Dict, List

from app.adapters.books_meta import GoogleBooksAdapter, OpenLibraryAdapter
from app.cache.helpers import cache_get, cache_set, meta_key
from app.config import settings
from app.services.fingerprint import make_fingerprint
from app.services.types import CanonicalBook


class BooksMetaService:
    def __init__(self):
        self.ol = OpenLibraryAdapter()
        self.gb = GoogleBooksAdapter()
        self.ttl = int(getattr(settings, "METADATA_TTL_SECS", 5 * 24 * 3600))

    async def enrich_one(self, partial: Dict[str, Any]) -> CanonicalBook | None:
        title = (partial.get("title") or "").strip()
        author = (partial.get("author") or "").strip()
        isbn = (partial.get("isbn") or "").strip()
        fp = make_fingerprint(title, author, isbn)
        key = meta_key(fp)

        # cache check
        cached = await cache_get(key)
        if cached:
            return CanonicalBook.parse_obj(cached)

        # OpenLibrary first
        result = None
        if isbn:
            result = await self.ol.by_isbn(isbn) or await self.ol.search(title, author)
        else:
            result = await self.ol.search(title, author)

        # Fallback: Google Books
        if not result:
            result = (
                (await self.gb.by_isbn(isbn))
                if isbn
                else (await self.gb.search(title, author))
            )

        if result:
            await cache_set(key, result.dict(), self.ttl)
        return result

    async def enrich_many(self, partials: List[Dict[str, Any]]) -> List[CanonicalBook]:
        out: List[CanonicalBook] = []
        for p in partials:
            b = await self.enrich_one(p)
            if b:
                out.append(b)
        return out
