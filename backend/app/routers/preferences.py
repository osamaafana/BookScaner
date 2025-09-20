import uuid
from typing import Any, Dict

from app.db.models import Device, Preference
from app.deps import device_id, get_db
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_400_BAD_REQUEST

router = APIRouter(tags=["preferences"])


async def ensure_device_exists(db: AsyncSession, device_id: str):
    """Ensure device exists in database, create if not"""
    # Check if device exists
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()

    if not device:
        # Create device
        device = Device(id=uuid.UUID(device_id))
        db.add(device)
        await db.commit()
        await db.refresh(device)

    return device


@router.get("/preferences")
async def get_prefs(db: AsyncSession = Depends(get_db), did: str = Depends(device_id)):
    await ensure_device_exists(db, did)
    q = await db.execute(
        select(Preference.key, Preference.value_json).where(Preference.device_id == did)
    )
    prefs = {k: v for (k, v) in q.all()}
    return {"preferences": prefs}


@router.put("/preferences")
async def put_prefs(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    did: str = Depends(device_id),
):
    if not isinstance(payload, dict):
        raise HTTPException(
            HTTP_400_BAD_REQUEST, "Body must be an object of key -> value"
        )

    # Ensure device exists before creating preferences
    await ensure_device_exists(db, did)

    for k, v in payload.items():
        stmt = insert(Preference).values(device_id=did, key=k, value_json=v)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Preference.device_id, Preference.key],
            set_={"value_json": stmt.excluded.value_json},
        )
        await db.execute(stmt)
    await db.commit()
    return {"ok": True}
