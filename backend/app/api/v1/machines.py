from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.models import Machine, MachineAssignment, MaintenanceRecord, UserRole
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
    _=Depends(require_roles(UserRole.admin)),
):
    exists = await db.execute(select(Machine).where(Machine.serial_number == body.serial_number))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Serial number already exists")
    machine = Machine(**body.model_dump())
    db.add(machine)
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
    _=Depends(require_roles(UserRole.admin)),
):
    m = await db.get(Machine, machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    await db.commit()
    await db.refresh(m)
    return m


@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_machine(
    machine_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    m = await db.get(Machine, machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
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
