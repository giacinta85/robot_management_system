from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.audit_helpers import log_action, model_to_dict
from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.models import Machine, MachineAssignment, MaintenanceRecord, UserRole, MachineStatus
from app.schemas.schemas import MachineCreate, MachineOut, MachineUpdate, AssignmentCreate, AssignmentOut

router = APIRouter(prefix="/machines", tags=["machines"])

_MANAGE_ROLES = (UserRole.admin, UserRole.rd_test)


@router.get("", response_model=list[MachineOut])
async def list_machines(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_MANAGE_ROLES)),
):
    result = await db.execute(select(Machine).order_by(Machine.serial_number))
    return result.scalars().all()


@router.post("", response_model=MachineOut, status_code=status.HTTP_201_CREATED)
async def create_machine(
    body: MachineCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    exists = await db.execute(select(Machine).where(Machine.serial_number == body.serial_number))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Serial number already exists")
    machine = Machine(**body.model_dump())
    db.add(machine)
    await db.flush()  # get machine.id before commit
    await log_action(
        db,
        user_id=str(current_user.id),
        username=current_user.username,
        table_name="machines",
        record_id=str(machine.id),
        operation="create",
        before=None,
        after=model_to_dict(machine),
        description=f"新增机器 {machine.serial_number}",
    )
    await db.commit()
    await db.refresh(machine)
    return machine


@router.get("/{machine_id}", response_model=MachineOut)
async def get_machine(
    machine_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_MANAGE_ROLES)),
):
    m = await db.get(Machine, machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    return m


@router.patch("/{machine_id}", response_model=MachineOut)
async def update_machine(
    machine_id: UUID,
    body: MachineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    m = await db.get(Machine, machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    before = model_to_dict(m)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    await log_action(
        db,
        user_id=str(current_user.id),
        username=current_user.username,
        table_name="machines",
        record_id=str(m.id),
        operation="update",
        before=before,
        after=model_to_dict(m),
        description=f"更新机器 {m.serial_number}",
    )
    await db.commit()
    await db.refresh(m)
    return m


@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_machine(
    machine_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    m = await db.get(Machine, machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    before = model_to_dict(m)
    await log_action(
        db,
        user_id=str(current_user.id),
        username=current_user.username,
        table_name="machines",
        record_id=str(m.id),
        operation="delete",
        before=before,
        after=None,
        description=f"删除机器 {m.serial_number}",
    )
    await db.delete(m)
    await db.commit()


# ── Assignments ────────────────────────────────

@router.get("/{machine_id}/assignments", response_model=list[AssignmentOut])
async def list_assignments(
    machine_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_MANAGE_ROLES)),
):
    result = await db.execute(
        select(MachineAssignment)
        .where(MachineAssignment.machine_id == machine_id)
        .order_by(MachineAssignment.start_date.desc())
    )
    return result.scalars().all()


@router.post("/{machine_id}/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    machine_id: UUID,
    body: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(*_MANAGE_ROLES)),
):
    body.machine_id = machine_id
    a = MachineAssignment(**body.model_dump(), created_by=current_user.id)
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return a


# ── Dashboard stats ────────────────────────────

@router.get("/stats/summary")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin, UserRole.rd_test)),
):
    """返回机器状态统计数字"""
    rows = (await db.execute(
        select(Machine.status, func.count(Machine.id)).group_by(Machine.status)
    )).all()
    counts = {r[0].value: r[1] for r in rows}
    total = sum(counts.values())
    return {
        "total": total,
        "idle": counts.get("idle", 0),
        "in_use": counts.get("in_use", 0),
        "under_repair": counts.get("under_repair", 0),
        "retired": counts.get("retired", 0),
    }
