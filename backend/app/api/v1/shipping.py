"""Shipping requests API (public submit, admin manage)."""
import json
import os
import uuid as _uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.models import ShippingRequest, UserRole
from app.schemas.schemas import ShippingRequestCreate, ShippingRequestOut

router = APIRouter(prefix="/shipping", tags=["shipping"])

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Public: submit ────────────────────────────

@router.post("/requests", response_model=ShippingRequestOut, status_code=201)
async def submit_shipping_request(body: ShippingRequestCreate, db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone
    req = ShippingRequest(
        **body.model_dump(),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


# ── File upload (admin) ───────────────────────

@router.post("/requests/{request_id}/attachments")
async def upload_attachment(
    request_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    req = await db.get(ShippingRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Not found")

    ext = os.path.splitext(file.filename or "file")[1]
    filename = f"{_uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    attachments = json.loads(req.attachments or "[]")
    attachments.append({"name": file.filename, "url": f"/api/static/uploads/{filename}"})
    req.attachments = json.dumps(attachments)
    await db.commit()
    return {"name": file.filename, "url": f"/api/static/uploads/{filename}"}


@router.delete("/requests/{request_id}/attachments")
async def delete_attachment(
    request_id: UUID,
    url: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    req = await db.get(ShippingRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Not found")
    attachments = json.loads(req.attachments or "[]")
    attachments = [a for a in attachments if a["url"] != url]
    req.attachments = json.dumps(attachments)
    await db.commit()
    # Also remove file from disk
    filename = url.split("/")[-1]
    fp = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(fp):
        os.remove(fp)
    return {"ok": True}


# ── Admin: list & update status ───────────────

@router.get("/requests", response_model=list[ShippingRequestOut])
async def list_shipping_requests(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    result = await db.execute(select(ShippingRequest).order_by(ShippingRequest.created_at.desc()))
    return result.scalars().all()


@router.patch("/requests/{request_id}/status")
async def update_shipping_status(
    request_id: UUID,
    status: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    req = await db.get(ShippingRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Not found")
    req.status = status
    await db.commit()
    return {"status": status}
