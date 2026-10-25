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


def _words(s: str) -> set:
    return {w for w in normalize_text(s or "").split() if len(w) > 1}


def author_matches(wanted: str, candidates: List[str]) -> bool:
    """True when the reader's author plausibly names one of the candidate authors.

    Compares name words so "P. L. Travers" matches "Pamela Lyndon Travers".
    """
    if not wanted:
        return True
    wanted_words = {w for w in _words(wanted) if len(w) > 2}
    for name in candidates:
        if not name:
            continue
        if fuzzy_similarity(wanted, name) >= 0.8:
            return True
        # a shared name word (usually the surname): "P. L. Travers" ~ "Pamela Lyndon Travers"
        if wanted_words & {w for w in _words(name) if len(w) > 2}:
            return True
    return False


def title_matches(wanted: str, candidate: str, author_confirmed: bool = False) -> bool:
    """True when the found title is really the book the reader saw.

    Accepts close spellings and short forms ("Sapiens" vs "Sapiens: A Brief History..."),
    rejects loose hits ("War" vs "Why Europe is at War").
    """
    if not wanted or not candidate:
        return False
    if fuzzy_similarity(wanted, candidate) >= 0.75:
        return True
    w, c = normalize_text(wanted), normalize_text(candidate)
    # found title = read title + subtitle ("Sapiens" -> "Sapiens: A Brief History...")
    if c.startswith(w):
        return True
    # read title carried a subtitle the catalog leaves out ("Persepolis: The Story..." -> "Persepolis")
    main = normalize_text(wanted.split(":")[0])
    if main == c:
        return True
    # catalog title is the start of the read text: "Sapiens A Brief History..." -> "Sapiens".
    # A lone word only counts when the author also matched ("Julian Barnes" !-> "Julian" by Gore Vidal)
    if w.startswith(c + " "):
        return len(c.split()) >= 2 or author_confirmed
    return False


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
        items = await self._search_items(q)
        for item in items:
            vi = item.get("volumeInfo") or {}
            authors = vi.get("authors") or []
            if author_matches(author, authors) and title_matches(
                title, vi.get("title") or "", author_confirmed=bool(author)
            ):
                return self._to_canonical(item, fallback=(title, author))
        return None

    async def _search(self, q: str) -> Optional[dict]:
        items = await self._search_items(q)
        return items[0] if items else None

    async def _search_items(self, q: str) -> List[dict]:
        params = {"q": q, "maxResults": 5}
        if self.key:
            params["key"] = self.key
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(GB_API, params=params)
                r.raise_for_status()
                d = r.json()
            return d.get("items") or []
        except (httpx.HTTPStatusError, httpx.RequestError, Exception) as e:
            # str(e) holds the request URL with the API key; log the class only
            print(f"DEBUG: Google Books search failed for query '{q}': {e.__class__.__name__}")
            return []

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
        # Try to get the best available cover image (prefer larger sizes)
        image_links = vi.get("imageLinks") or {}
        cover = (
            image_links.get("large")
            or image_links.get("medium")
            or image_links.get("small")
            or image_links.get("thumbnail")
        )

        # Debug logging
        print(f"DEBUG: Google Books - '{title}' by '{author}' - Cover: {cover}")
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
    async def _search_docs(self, params: dict) -> List[dict]:
        return await _ol_get(params)

    @staticmethod
    def _matching(docs: List[dict], title: str, author: str) -> List[dict]:
        """Only results that really are the book the reader saw."""
        return [
            d
            for d in docs
            if author_matches(author, d.get("author_name") or [])
            and title_matches(title, d.get("title") or "", author_confirmed=bool(author))
        ]

    async def by_isbn(self, isbn: str) -> Optional[CanonicalBook]:
        if not settings.OPENLIBRARY_ENABLED:
            return None
        isbn = normalize_isbn(isbn)
        if not isbn:
            return None
        params = {"bibkeys": f"ISBN:{isbn}", "format": "json", "jscmd": "data"}
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(OL_BOOKS_API, params=params)
                r.raise_for_status()
                data = r.json()
        except (httpx.HTTPStatusError, httpx.RequestError, Exception) as e:
            print(f"DEBUG: OpenLibrary by_isbn failed for ISBN '{isbn}': {e}")
            return None

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

        docs = await self._search_docs({"title": title, "author": author})
        matching = self._matching(docs, title, author)
        if not matching:
            # Long titles with subtitles often miss the title field; free-text search finds them
            docs = await self._search_docs({"q": title, "author": author})
            matching = self._matching(docs, title, author)
        if not matching:
            print(f"DEBUG: OpenLibrary - no matching result for '{title}' by '{author}'")
            return None
        docs = matching

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

        ranked = sorted(docs, key=score, reverse=True)
        best = ranked[0]

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

        # Try to get cover URL - prefer ISBN-based, fallback to cover_i if available
        cover_url = _cover_or_none(isbn) if isbn else None
        if not cover_url:
            # Use a cover ID from this work, or from another matching result
            cover_id = best.get("cover_i") or next(
                (d.get("cover_i") for d in ranked if d.get("cover_i")), None
            )
            if cover_id:
                cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"

        # Debug logging
        print(f"DEBUG: Book '{title}' by '{author}' - ISBN: {isbn}, Cover: {cover_url}")
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


async def _ol_get(params: dict) -> List[dict]:
    params = {k: v for k, v in params.items() if v}
    params["limit"] = 5
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(OL_SEARCH_API, params=params)
            r.raise_for_status()
            return r.json().get("docs") or []
    except (httpx.HTTPStatusError, httpx.RequestError, Exception) as e:
        print(f"DEBUG: OpenLibrary search failed for {params}: {e.__class__.__name__}")
        return []


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
