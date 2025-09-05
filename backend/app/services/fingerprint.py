import re
import unicodedata

_ISBN_DIGITS = re.compile(r"[^0-9Xx]")


def _strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)
    )


def _clean_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def normalize_text(s: str) -> str:
    s = _strip_accents(_clean_spaces(s.lower()))
    s = re.sub(r"[^\w\s]", " ", s)  # drop punctuation
    return _clean_spaces(s)


def normalize_isbn(isbn: str) -> str:
    return _ISBN_DIGITS.sub("", isbn or "")


def make_fingerprint(title: str = "", author: str = "", isbn: str = "") -> str:
    if isbn:
        return normalize_isbn(isbn)  # prefer ISBN when present
    t = normalize_text(title or "")
    a = normalize_text(author or "")
    base = f"{t}|{a}" if a else t
    return base
