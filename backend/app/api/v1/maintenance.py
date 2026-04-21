from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.models import MaintenanceRecord, Machine, MachineStatus, UserRole
from app.schemas.schemas import MaintenanceCreate, MaintenanceOut, MaintenanceUpdate

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("", response_model=list[MaintenanceOut])
async def list_records(
    machine_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin, UserRole.maintenance, UserRole.rd_test)),
):
    q = select(MaintenanceRecord).order_by(MaintenanceRecord.damage_date.desc())
    if machine_id:
        q = q.where(MaintenanceRecord.machine_id == machine_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=MaintenanceOut, status_code=status.HTTP_201_CREATED)
async def create_record(
    body: MaintenanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin, UserRole.maintenance)),
):
    # Update machine status to under_repair
    machine = await db.get(Machine, body.machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    machine.status = MachineStatus.under_repair

    record = MaintenanceRecord(**body.model_dump(), technician_id=current_user.id)
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/{record_id}", response_model=MaintenanceOut)
async def get_record(
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin, UserRole.maintenance, UserRole.rd_test)),
):
    record = await db.get(MaintenanceRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.patch("/{record_id}", response_model=MaintenanceOut)
async def update_record(
    record_id: UUID,
    body: MaintenanceUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin, UserRole.maintenance)),
):
    record = await db.get(MaintenanceRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    # If resolved, set machine back to idle
    if body.is_resolved:
        machine = await db.get(Machine, record.machine_id)
        if machine:
            machine.status = MachineStatus.idle
    await db.commit()
    await db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin, UserRole.maintenance)),
):
    record = await db.get(MaintenanceRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    await db.delete(record)
    await db.commit()
