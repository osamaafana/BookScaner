import hashlib
from typing import Iterable


def books_hash(book_ids: Iterable[int]) -> str:
    # deterministic across same set/order: sort first
    s = ",".join(str(i) for i in sorted(set(book_ids)))
    return hashlib.sha1(s.encode("utf-8")).hexdigest()
