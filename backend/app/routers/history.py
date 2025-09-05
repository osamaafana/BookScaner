from fastapi import APIRouter

router = APIRouter(tags=["history"])


@router.get("/history")
async def get_history():
    return {"items": [], "status": "stub"}


@router.post("/history")
async def add_history(event: dict):
    return {"ok": True}
