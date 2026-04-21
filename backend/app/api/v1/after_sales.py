"""After-sales requests API (public submit, admin manage)."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.models import AfterSalesRequest, UserRole
from app.schemas.schemas import AfterSalesRequestCreate, AfterSalesRequestOut

router = APIRouter(prefix="/after-sales", tags=["after-sales"])


# ── Public: submit ────────────────────────────

@router.post("/requests", response_model=AfterSalesRequestOut, status_code=201)
async def submit_after_sales_request(body: AfterSalesRequestCreate, db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    req = AfterSalesRequest(**body.model_dump(), created_at=now, updated_at=now)
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


# ── Admin: list ───────────────────────────────

@router.get("/requests", response_model=list[AfterSalesRequestOut])
async def list_after_sales_requests(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    result = await db.execute(select(AfterSalesRequest).order_by(AfterSalesRequest.created_at.desc()))
    return result.scalars().all()


@router.patch("/requests/{request_id}")
async def update_after_sales_request(
    request_id: UUID,
    status: str | None = None,
    handled_notes: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    req = await db.get(AfterSalesRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Not found")
    if status is not None:
        req.status = status
    if handled_notes is not None:
        req.handled_notes = handled_notes
    req.handled_by = current_user.id
    await db.commit()
    await db.refresh(req)
    return req
