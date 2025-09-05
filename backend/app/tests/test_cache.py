import pytest

from ..cache import helpers


@pytest.mark.asyncio
async def test_cache_set_get(tmp_path):
    key = "test:key"
    val = {"a": 1, "b": "c"}
    await helpers.cache_set(key, val, 5)
    got = await helpers.cache_get(key)
    assert got == val
