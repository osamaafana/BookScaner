from fastapi import APIRouter

router = APIRouter(tags=["recommend"])


@router.post("/recommend")
async def recommend(payload: dict):
    return {"recs": [], "status": "stub"}
