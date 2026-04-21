from datetime import date, timedelta
import hashlib
import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.audit_helpers import log_action, model_to_dict
from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.models import (
    MarketingRequest, MarketingAllocation, Machine,
    MachineAssignment, MaintenanceRecord,
    RequestStatus, AssignmentDepartment, UserRole, MachineStatus, MachineUsageType,
)
from app.schemas.schemas import (
    MarketingRequestCreate, MarketingRequestOut,
    MarketingRequestReview, GanttEvent, GanttResource, MachineOut,
)

router = APIRouter(prefix="/marketing", tags=["marketing"])

# Color map for gantt
_COLORS = {
    "marketing": "#1677ff",
    "rd": "#52c41a",
    "test": "#fa8c16",
    "maintenance": "#ff4d4f",
}

# Distinct palette for per-project marketing colors
_MARKETING_PALETTE = [
    "#1677ff", "#722ed1", "#13c2c2", "#eb2f96", "#fa541c",
    "#fa8c16", "#2f54eb", "#389e0d", "#08979c", "#d46b08",
]

def _project_color(request_id: str) -> str:
    idx = int(hashlib.md5(request_id.encode()).hexdigest(), 16) % len(_MARKETING_PALETTE)
    return _MARKETING_PALETTE[idx]


def _serialize_request_body(data: dict) -> dict:
    """Serialize list[UUID] fields to JSON strings for storage."""
    for field in ("dance_policy_ids", "voice_package_ids", "motion_action_ids"):
        v = data.get(field)
        if v is not None:
            data[field] = json.dumps([str(i) for i in v])
        else:
            data[field] = None
    return data


# ── Public: submit request (no auth) ──────────

@router.post("/requests", response_model=MarketingRequestOut, status_code=status.HTTP_201_CREATED)
async def submit_request(body: MarketingRequestCreate, db: AsyncSession = Depends(get_db)):
    data = _serialize_request_body(body.model_dump())
    req = MarketingRequest(**data)
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


@router.get("/requests/{request_id}", response_model=MarketingRequestOut)
async def get_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    req = await db.get(MarketingRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req


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
    if req.status not in (RequestStatus.pending, RequestStatus.rejected):
        raise HTTPException(status_code=400, detail="只有待审批或已拒绝的申请可以审批")
    before = model_to_dict(req)
    req.status = body.status
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.now(timezone.utc)

    if body.status == RequestStatus.approved and body.machine_ids:
        # ── 冲突检测：仅检查 MarketingAllocation（其他已审批市场申请）──
        # 注：不检查 MachineAssignment，因为机器状态已由 idle 过滤保证
        conflicts = []
        for mid in body.machine_ids:
            conflict_q = (
                select(MarketingAllocation)
                .join(MarketingRequest, MarketingAllocation.request_id == MarketingRequest.id)
                .where(
                    MarketingAllocation.machine_id == mid,
                    MarketingRequest.status == RequestStatus.approved,
                    MarketingAllocation.request_id != req.id,
                    MarketingRequest.start_date <= req.end_date,
                    MarketingRequest.end_date >= req.start_date,
                )
            )
            existing = (await db.execute(conflict_q)).scalars().first()
            if existing:
                conflicts.append(str(mid))

        if conflicts:
            raise HTTPException(
                status_code=400,
                detail=f"日期冲突：{len(conflicts)} 台机器在 {req.start_date} ~ {req.end_date} 期间已被其他已审批申请占用",
            )

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

    await log_action(
        db,
        user_id=str(current_user.id),
        username=current_user.username,
        table_name="marketing_requests",
        record_id=str(req.id),
        operation="update",
        before=before,
        after=model_to_dict(req),
        description=f"审批申请 {req.event_name}: {body.status.value}",
    )
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

    _dept_display = {
        "rd": "研发", "test": "测试", "marketing": "市场",
        "maintenance": "维修", "software": "软件",
    }
    _usage_display = {
        "motion_control": "运控", "testing": "测试", "software": "软件", "marketing": "市场",
    }
    resources: list[GanttResource] = [
        GanttResource(
            id=str(m.id),
            title=(
                f"{m.serial_number} ["
                + (
                    _dept_display.get(m.department or "", "")
                    or _usage_display.get(m.usage_type.value if m.usage_type else "", "-")
                )
                + "]"
            ),
            status=m.status.value,
        )
        for m in machines
    ]

    events: list[GanttEvent] = []

    # Marketing request events (from MarketingAllocation + MarketingRequest)
    mreq_q = (
        select(MarketingRequest, MarketingAllocation)
        .join(MarketingAllocation, MarketingAllocation.request_id == MarketingRequest.id)
        .where(
            MarketingRequest.status == RequestStatus.approved,
            MarketingRequest.start_date <= end,
            MarketingRequest.end_date >= start,
        )
    )
    mreq_rows = (await db.execute(mreq_q)).all()
    for req, alloc in mreq_rows:
        events.append(GanttEvent(
            id=f"mreq-{alloc.id}",
            resourceId=str(alloc.machine_id),
            title=req.event_name,
            start=req.start_date.isoformat(),
            end=req.end_date.isoformat(),
            color=_project_color(str(req.id)),
            type="marketing",
            request_id=str(req.id),
        ))

    # Maintenance in range (show all, including resolved)
    maint_q = select(MaintenanceRecord).where(
        and_(
            MaintenanceRecord.damage_date <= end,
            or_(MaintenanceRecord.repair_end_date >= start, MaintenanceRecord.repair_end_date.is_(None)),
        )
    )
    maint_records = (await db.execute(maint_q)).scalars().all()
    for r in maint_records:
        label = "已修复" if r.is_resolved else "维修中"
        maint_color = "#b7b7b7" if r.is_resolved else _COLORS["maintenance"]
        # FullCalendar end is exclusive, so add 1 day to include the repair_end_date column
        maint_end = (r.repair_end_date + timedelta(days=1)) if r.repair_end_date else end
        events.append(GanttEvent(
            id=f"maint-{r.id}",
            resourceId=str(r.machine_id),
            title=f"{label}：{r.damage_cause or ''}".rstrip("："),
            start=r.damage_date.isoformat(),
            end=maint_end.isoformat(),
            color=maint_color,
            type="maintenance",
            maintenance_id=str(r.id),
        ))

    return {"resources": [r.model_dump() for r in resources], "events": [e.model_dump() for e in events]}


@router.get("/idle-machines", response_model=list[MachineOut])
async def get_idle_marketing_machines(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    """返回用途为市场、状态为空闲的机器列表（供审批时选择）"""
    result = await db.execute(
        select(Machine).where(
            Machine.usage_type == MachineUsageType.marketing,
            Machine.status == MachineStatus.idle,
        ).order_by(Machine.serial_number)
    )
    return result.scalars().all()


# ── Admin: update marketing request ──────────

@router.patch("/requests/{request_id}", response_model=MarketingRequestOut)
async def update_request(
    request_id: UUID,
    body: MarketingRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    req = await db.get(MarketingRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    before = model_to_dict(req)
    data = _serialize_request_body(body.model_dump(exclude_none=True))
    for k, v in data.items():
        setattr(req, k, v)

    # If was approved, clear allocations and machine assignments before resetting
    if req.status == RequestStatus.approved:
        alloc_q = select(MarketingAllocation).where(MarketingAllocation.request_id == request_id)
        allocs = (await db.execute(alloc_q)).scalars().all()
        machine_ids = [a.machine_id for a in allocs]
        for a in allocs:
            await db.delete(a)
        for mid in machine_ids:
            assign_q = select(MachineAssignment).where(
                MachineAssignment.machine_id == mid,
                MachineAssignment.department == AssignmentDepartment.marketing,
            )
            assigns = (await db.execute(assign_q)).scalars().all()
            for a in assigns:
                await db.delete(a)

    # Always reset to pending so the request must be re-approved
    req.status = RequestStatus.pending
    req.reviewed_by = None
    req.reviewed_at = None

    await log_action(
        db,
        user_id=str(current_user.id),
        username=current_user.username,
        table_name="marketing_requests",
        record_id=str(req.id),
        operation="update",
        before=before,
        after=model_to_dict(req),
        description=f"修改申请 {req.event_name}（状态已重置为待审批）",
    )
    await db.commit()
    await db.refresh(req)
    return req


@router.delete("/requests/{request_id}", status_code=204)
async def delete_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    req = await db.get(MarketingRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    before = model_to_dict(req)
    # Clean up MachineAssignment records created when this request was approved
    alloc_q = select(MarketingAllocation).where(MarketingAllocation.request_id == request_id)
    allocations = (await db.execute(alloc_q)).scalars().all()
    machine_ids = [a.machine_id for a in allocations]
    if machine_ids:
        assign_q = select(MachineAssignment).where(
            MachineAssignment.machine_id.in_(machine_ids),
            MachineAssignment.department == AssignmentDepartment.marketing,
            MachineAssignment.start_date == req.start_date,
            MachineAssignment.end_date == req.end_date,
        )
        for assignment in (await db.execute(assign_q)).scalars().all():
            await db.delete(assignment)
    await log_action(
        db,
        user_id=str(current_user.id),
        username=current_user.username,
        table_name="marketing_requests",
        record_id=str(req.id),
        operation="delete",
        before=before,
        after=None,
        description=f"删除申请 {req.event_name}",
    )
    await db.delete(req)  # cascades to MarketingAllocation
    await db.commit()


# ── Admin: machine occupancy overview ─────────

@router.get("/occupancy")
async def get_occupancy(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    """返回所有机器的当前和未来占用记录（MachineAssignment + MarketingAllocation）"""
    from datetime import date as date_type
    today = date_type.today()

    # All machines
    machines_map = {
        m.id: m for m in (await db.execute(select(Machine))).scalars().all()
    }

    records = []

    # MachineAssignment — all non-ended assignments
    assign_q = select(MachineAssignment).where(
        or_(MachineAssignment.end_date >= today, MachineAssignment.end_date.is_(None))
    ).order_by(MachineAssignment.start_date)
    for a in (await db.execute(assign_q)).scalars().all():
        m = machines_map.get(a.machine_id)
        records.append({
            "type": "assignment",
            "machine_serial": m.serial_number if m else str(a.machine_id),
            "machine_model": m.model if m else "",
            "department": a.department.value,
            "start_date": a.start_date.isoformat(),
            "end_date": a.end_date.isoformat() if a.end_date else None,
            "notes": a.notes,
            "project": None,
        })

    # MarketingAllocation — all approved requests not yet ended
    mreq_q = (
        select(MarketingRequest, MarketingAllocation)
        .join(MarketingAllocation, MarketingAllocation.request_id == MarketingRequest.id)
        .where(
            MarketingRequest.status == RequestStatus.approved,
            MarketingRequest.end_date >= today,
        )
        .order_by(MarketingRequest.start_date)
    )
    for req, alloc in (await db.execute(mreq_q)).all():
        m = machines_map.get(alloc.machine_id)
        records.append({
            "type": "marketing",
            "machine_serial": m.serial_number if m else str(alloc.machine_id),
            "machine_model": m.model if m else "",
            "department": "marketing",
            "start_date": req.start_date.isoformat(),
            "end_date": req.end_date.isoformat(),
            "notes": None,
            "project": req.event_name,
        })

    records.sort(key=lambda r: r["start_date"])
    return records

