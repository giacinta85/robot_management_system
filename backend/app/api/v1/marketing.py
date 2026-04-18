from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.models import (
    MarketingRequest, MarketingAllocation, Machine,
    MachineAssignment, MaintenanceRecord,
    RequestStatus, AssignmentDepartment, UserRole,
)
from app.schemas.schemas import (
    MarketingRequestCreate, MarketingRequestOut,
    MarketingRequestReview, GanttEvent, GanttResource,
)

router = APIRouter(prefix="/marketing", tags=["marketing"])

# Color map for gantt
_COLORS = {
    "marketing": "#1677ff",
    "rd": "#52c41a",
    "test": "#fa8c16",
    "maintenance": "#ff4d4f",
}


# ── Public: submit request (no auth) ──────────

@router.post("/requests", response_model=MarketingRequestOut, status_code=status.HTTP_201_CREATED)
async def submit_request(body: MarketingRequestCreate, db: AsyncSession = Depends(get_db)):
    req = MarketingRequest(**body.model_dump())
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


@router.get("/requests", response_model=list[MarketingRequestOut])
async def list_requests(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    result = await db.execute(select(MarketingRequest).order_by(MarketingRequest.created_at.desc()))
    return result.scalars().all()


@router.patch("/requests/{request_id}/review", response_model=MarketingRequestOut)
async def review_request(
    request_id: UUID,
    body: MarketingRequestReview,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    from datetime import datetime, timezone
    req = await db.get(MarketingRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = body.status
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.now(timezone.utc)

    if body.status == RequestStatus.approved and body.machine_ids:
        for mid in body.machine_ids:
            alloc = MarketingAllocation(request_id=req.id, machine_id=mid)
            db.add(alloc)
        # Create assignments for the marketing period
        for mid in body.machine_ids:
            a = MachineAssignment(
                machine_id=mid,
                department=AssignmentDepartment.marketing,
                start_date=req.start_date,
                end_date=req.end_date,
                notes=f"Marketing: {req.event_name}",
                created_by=current_user.id,
            )
            db.add(a)

    await db.commit()
    await db.refresh(req)
    return req


# ── Gantt availability ────────────────────────

@router.get("/availability")
async def get_availability(
    start: date,
    end: date,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    """Returns FullCalendar resources + events for gantt view."""
    # All machines
    machines_result = await db.execute(select(Machine).order_by(Machine.serial_number))
    machines = machines_result.scalars().all()

    resources: list[GanttResource] = [
        GanttResource(id=str(m.id), title=f"{m.serial_number} ({m.model})", status=m.status.value)
        for m in machines
    ]

    events: list[GanttEvent] = []

    # Assignments in range
    assign_q = select(MachineAssignment).where(
        and_(
            MachineAssignment.start_date <= end,
            or_(MachineAssignment.end_date >= start, MachineAssignment.end_date.is_(None)),
        )
    )
    assignments = (await db.execute(assign_q)).scalars().all()
    for a in assignments:
        events.append(GanttEvent(
            id=f"assign-{a.id}",
            resourceId=str(a.machine_id),
            title=a.department.value.upper(),
            start=a.start_date.isoformat(),
            end=(a.end_date or end).isoformat(),
            color=_COLORS.get(a.department.value, "#888"),
            type="assignment",
        ))

    # Maintenance in range
    maint_q = select(MaintenanceRecord).where(
        and_(
            MaintenanceRecord.repair_start_date <= end,
            or_(MaintenanceRecord.repair_end_date >= start, MaintenanceRecord.repair_end_date.is_(None)),
            MaintenanceRecord.is_resolved == False,
        )
    )
    maint_records = (await db.execute(maint_q)).scalars().all()
    for r in maint_records:
        if r.repair_start_date:
            events.append(GanttEvent(
                id=f"maint-{r.id}",
                resourceId=str(r.machine_id),
                title="维修中",
                start=r.repair_start_date.isoformat(),
                end=(r.repair_end_date or end).isoformat(),
                color=_COLORS["maintenance"],
                type="maintenance",
            ))

    return {"resources": [r.model_dump() for r in resources], "events": [e.model_dump() for e in events]}
