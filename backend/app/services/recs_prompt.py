from textwrap import shorten
from typing import List

SYSTEM = "You are a reading recommender."

TEMPLATE = (
    "You are a reading recommender.\n"
    "Device likes: {genres}.\n"
    "Recent authors: {authors}.\n"
    "From shelf: {titles}.\n"
    "Recommend 6 diverse books not already owned.\n"
    "Return: title | author | why it fits (<= 20 words)."
)


def build_prompt(genres: List[str], authors: List[str], titles: List[str]) -> str:
    g = ", ".join(genres[:5]) if genres else "unknown"
    a = ", ".join(authors[:6]) if authors else "unknown"
    # cap titles list to keep tokens low
    t = "; ".join(titles[:50]) if titles else "none"
    # belt-and-suspenders truncation
    t = shorten(t, width=2000, placeholder=" …")
    return TEMPLATE.format(genres=g, authors=a, titles=t)
