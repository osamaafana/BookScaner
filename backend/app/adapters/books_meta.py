from typing import List, Optional

import httpx
from app.config import settings
from app.services.fingerprint import (make_fingerprint, normalize_isbn,
                                      normalize_text)
from app.services.types import CanonicalBook

try:
    from Levenshtein import distance as levenshtein_distance

    LEVENSHTEIN_AVAILABLE = True
except ImportError:
    LEVENSHTEIN_AVAILABLE = False


OL_BOOKS_API = "https://openlibrary.org/api/books"
OL_SEARCH_API = "https://openlibrary.org/search.json"
OL_COVER_TPL = "https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"

GB_API = "https://www.googleapis.com/books/v1/volumes"


def fuzzy_similarity(s1: str, s2: str) -> float:
    """
    Calculate fuzzy similarity between two strings using Levenshtein distance.
    Returns a score between 0.0 (no match) and 1.0 (perfect match).
    Falls back to basic substring matching if Levenshtein is not available.
    """
    if not s1 or not s2:
        return 0.0

    s1_norm = normalize_text(s1)
    s2_norm = normalize_text(s2)

    if s1_norm == s2_norm:
        return 1.0

    if LEVENSHTEIN_AVAILABLE:
        # Use Levenshtein distance for precise fuzzy matching
        max_len = max(len(s1_norm), len(s2_norm))
        if max_len == 0:
            return 1.0
        distance = levenshtein_distance(s1_norm, s2_norm)
        return 1.0 - (distance / max_len)
    else:
        # Fallback to basic substring matching
        if s1_norm in s2_norm or s2_norm in s1_norm:
            return 0.7  # Good but not perfect match
        return 0.0


class GoogleBooksAdapter:
    def __init__(self):
        self.key = settings.GOOGLEBOOKS_API_KEY or ""

    async def by_isbn(self, isbn: str) -> Optional[CanonicalBook]:
        q = f"isbn:{normalize_isbn(isbn)}"
        data = await self._search(q)
        return self._to_canonical(data)

    async def search(self, title: str, author: str = "") -> Optional[CanonicalBook]:
        parts = []
        if title:
            parts.append(f'intitle:"{title}"')
        if author:
            parts.append(f'inauthor:"{author}"')
        q = " ".join(parts) if parts else title
        data = await self._search(q)
        return self._to_canonical(data, fallback=(title, author))

    async def _search(self, q: str) -> Optional[dict]:
        params = {"q": q, "maxResults": 5}
        if self.key:
            params["key"] = self.key
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(GB_API, params=params)
            r.raise_for_status()
            d = r.json()
        items = d.get("items") or []
        return items[0] if items else None

    def _to_canonical(
        self, item: Optional[dict], fallback: Optional[tuple] = None
    ) -> Optional[CanonicalBook]:
        if not item:
            return None
        vi = item.get("volumeInfo") or {}
        title = vi.get("title") or (fallback[0] if fallback else "")
        authors = vi.get("authors") or []
        author = authors[0] if authors else (fallback[1] if fallback else None)
        # Prefer industryIdentifiers ISBN_13 or ISBN_10
        isbn = None
        for ident in vi.get("industryIdentifiers") or []:
            if ident.get("type") in {"ISBN_13", "ISBN_10"}:
                isbn = normalize_isbn(ident.get("identifier") or "")
                if ident.get("type") == "ISBN_13":
                    break
        cover = (vi.get("imageLinks") or {}).get("thumbnail")
        year = None
        if vi.get("publishedDate"):
            try:
                year = int(vi["publishedDate"][:4])
            except Exception:
                pass

        return CanonicalBook(
            title=title,
            author=author,
            isbn=isbn,
            cover_url=cover,
            publisher=vi.get("publisher"),
            year=year,
            subjects=None,
            fingerprint=make_fingerprint(title, author or "", isbn or ""),
        )


class OpenLibraryAdapter:
    async def by_isbn(self, isbn: str) -> Optional[CanonicalBook]:
        if not settings.OPENLIBRARY_ENABLED:
            return None
        isbn = normalize_isbn(isbn)
        if not isbn:
            return None
        params = {"bibkeys": f"ISBN:{isbn}", "format": "json", "jscmd": "data"}
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(OL_BOOKS_API, params=params)
            r.raise_for_status()
            data = r.json()

        item = data.get(f"ISBN:{isbn}")
        if not item:
            return None

        title = item.get("title")
        authors = item.get("authors") or []
        author = authors[0].get("name") if authors else None
        publishers = item.get("publishers") or []
        publisher = publishers[0].get("name") if publishers else None
        year = item.get("publish_date")
        year_int = _parse_year(year)
        cover_url = _cover_or_none(isbn)

        cb = CanonicalBook(
            title=title or "",
            author=author,
            isbn=isbn,
            cover_url=cover_url,
            publisher=publisher,
            year=year_int,
            subjects=None,
            fingerprint=make_fingerprint(title or "", author or "", isbn),
        )
        return cb

    async def search(self, title: str, author: str = "") -> Optional[CanonicalBook]:
        if not settings.OPENLIBRARY_ENABLED:
            return None
        if not (title or author):
            return None
        params = {"title": title, "author": author, "limit": 5}
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(OL_SEARCH_API, params=params)
            r.raise_for_status()
            data = r.json()

        docs: List[dict] = data.get("docs") or []
        if not docs:
            return None

        # pick best doc by improved fuzzy scoring: title similarity + author similarity + edition_count
        def score(d: dict) -> tuple:
            d_title = d.get("title") or ""

            # Use fuzzy similarity for title matching (0.0 to 1.0)
            title_similarity = fuzzy_similarity(title, d_title)

            # Use fuzzy similarity for author matching
            author_names = " ".join(d.get("author_name") or [])
            author_similarity = (
                fuzzy_similarity(author, author_names) if author else 0.0
            )

            # Edition count as a tie-breaker (normalize to 0-1 range)
            editions = int(d.get("edition_count") or 0)
            edition_score = min(editions / 100.0, 1.0)  # Cap at 100 editions = 1.0

            # Weighted scoring: title is most important, then author, then editions
            return (title_similarity * 10, author_similarity * 5, edition_score)

        best = sorted(docs, key=score, reverse=True)[0]

        # prefer ISBN13 if present
        isbns = best.get("isbn") or []
        isbn = None
        for x in isbns:
            x = normalize_isbn(x)
            if len(x) == 13:
                isbn = x
                break
        if not isbn and isbns:
            isbn = normalize_isbn(isbns[0])

        cover_url = _cover_or_none(isbn) if isbn else None
        year_int = (
            int(best["first_publish_year"]) if best.get("first_publish_year") else None
        )
        author_name = (best.get("author_name") or [None])[0]

        return CanonicalBook(
            title=best.get("title") or title,
            author=author_name,
            isbn=isbn,
            cover_url=cover_url,
            publisher=None,
            year=year_int,
            subjects=(best.get("subject") or None),
            fingerprint=make_fingerprint(
                best.get("title") or title, author_name or author, isbn or ""
            ),
        )


def _cover_or_none(isbn: Optional[str]) -> Optional[str]:
    if not isbn:
        return None
    return OL_COVER_TPL.format(isbn=isbn)


def _parse_year(s: Optional[str]) -> Optional[int]:
    if not s:
        return None
    # try to find a 4-digit year
    import re

    m = re.search(r"(19|20)\d{2}", s)
    return int(m.group(0)) if m else None
