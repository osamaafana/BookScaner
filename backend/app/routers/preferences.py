from fastapi import APIRouter

router = APIRouter(tags=["preferences"])


@router.get("/preferences")
async def get_prefs():
    return {"preferences": {}, "status": "stub"}


@router.put("/preferences")
async def put_prefs(prefs: dict):
    return {"ok": True}
