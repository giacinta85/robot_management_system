from uuid import UUID
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.audit_helpers import log_action, model_to_dict
from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.models import (
    Machine, MachineAssignment, MaintenanceRecord, UserRole, MachineStatus,
    MachineResourceLink, MotorFirmwareVersion, PowerBoardVersion, SystemImageVersion,
    ResourceLinkType, MachineAttributeValue,
)
from app.schemas.schemas import (
    MachineCreate, MachineOut, MachineUpdate, AssignmentCreate, AssignmentOut,
    MachineResourceLinkCreate, MachineResourceLinkOut,
    MachineAttributeValuesUpdate, MachineAttributeValuesOut,
)

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


# ── Machine Resource Links ─────────────────────

_RESOURCE_MODEL_MAP = {
    ResourceLinkType.motor_firmware: MotorFirmwareVersion,
    ResourceLinkType.power_board: PowerBoardVersion,
    ResourceLinkType.system_image: SystemImageVersion,
}

_RESOURCE_TYPE_LABEL = {
    ResourceLinkType.motor_firmware: "电机固件版本",
    ResourceLinkType.power_board: "电源板版本",
    ResourceLinkType.system_image: "系统镜像版本",
}


@router.get("/{machine_id}/resource-links", response_model=list[MachineResourceLinkOut])
async def list_machine_resource_links(
    machine_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_MANAGE_ROLES)),
):
    result = await db.execute(
        select(MachineResourceLink)
        .where(MachineResourceLink.machine_id == machine_id)
        .order_by(MachineResourceLink.resource_type, MachineResourceLink.created_at)
    )
    links = result.scalars().all()

    # Resolve resource names
    out = []
    for link in links:
        rtype = ResourceLinkType(link.resource_type)
        Model = _RESOURCE_MODEL_MAP.get(rtype)
        resource_name = None
        if Model:
            res = await db.get(Model, link.resource_id)
            if res:
                resource_name = res.name
        item = MachineResourceLinkOut(
            id=link.id,
            machine_id=link.machine_id,
            resource_type=link.resource_type,
            resource_id=link.resource_id,
            created_at=link.created_at,
            resource_name=resource_name,
        )
        out.append(item)
    return out


@router.post("/{machine_id}/resource-links", response_model=MachineResourceLinkOut, status_code=status.HTTP_201_CREATED)
async def add_machine_resource_link(
    machine_id: UUID,
    body: MachineResourceLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    m = await db.get(Machine, machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")

    rtype = ResourceLinkType(body.resource_type)
    Model = _RESOURCE_MODEL_MAP.get(rtype)
    if not Model:
        raise HTTPException(status_code=400, detail="Invalid resource_type")

    res = await db.get(Model, body.resource_id)
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Check duplicate
    existing = await db.execute(
        select(MachineResourceLink).where(
            MachineResourceLink.machine_id == machine_id,
            MachineResourceLink.resource_type == rtype,
            MachineResourceLink.resource_id == body.resource_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Link already exists")

    link = MachineResourceLink(
        machine_id=machine_id,
        resource_type=rtype,
        resource_id=body.resource_id,
    )
    db.add(link)
    await db.flush()
    await log_action(
        db, user_id=str(current_user.id), username=current_user.username,
        table_name="machine_resource_links", record_id=str(link.id), operation="create",
        before=None, after={"machine_id": str(machine_id), "resource_type": rtype.value, "resource_id": str(body.resource_id)},
        description=f"机器 {m.serial_number} 关联{_RESOURCE_TYPE_LABEL.get(rtype, '')} {res.name}",
    )
    await db.commit()
    await db.refresh(link)
    return MachineResourceLinkOut(
        id=link.id,
        machine_id=link.machine_id,
        resource_type=link.resource_type,
        resource_id=link.resource_id,
        created_at=link.created_at,
        resource_name=res.name,
    )


@router.delete("/{machine_id}/resource-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_machine_resource_link(
    machine_id: UUID,
    link_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    link = await db.get(MachineResourceLink, link_id)
    if not link or link.machine_id != machine_id:
        raise HTTPException(status_code=404, detail="Link not found")
    m = await db.get(Machine, machine_id)
    await log_action(
        db, user_id=str(current_user.id), username=current_user.username,
        table_name="machine_resource_links", record_id=str(link_id), operation="delete",
        before={"machine_id": str(machine_id), "resource_type": link.resource_type, "resource_id": str(link.resource_id)},
        after=None,
        description=f"机器 {m.serial_number if m else machine_id} 删除资源关联",
    )
    await db.delete(link)
    await db.commit()


# ── Machine Attribute Values ───────────────────────────────────────────────────

@router.get("/{machine_id}/attributes", response_model=MachineAttributeValuesOut)
async def get_machine_attributes(
    machine_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_MANAGE_ROLES, UserRole.admin)),
):
    result = await db.execute(
        select(MachineAttributeValue).where(MachineAttributeValue.machine_id == machine_id)
    )
    rows = result.scalars().all()
    return MachineAttributeValuesOut(values={r.attribute_key: r.value for r in rows})


@router.patch("/{machine_id}/attributes", response_model=MachineAttributeValuesOut)
async def set_machine_attributes(
    machine_id: UUID,
    body: MachineAttributeValuesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(*_MANAGE_ROLES, UserRole.admin)),
):
    from datetime import datetime, timezone
    machine = await db.get(Machine, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    for key, value in body.values.items():
        result = await db.execute(
            select(MachineAttributeValue).where(
                MachineAttributeValue.machine_id == machine_id,
                MachineAttributeValue.attribute_key == key,
            )
        )
        existing = result.scalar()
        now = datetime.now(timezone.utc)
        if existing:
            existing.value = value
            existing.updated_at = now
        else:
            db.add(MachineAttributeValue(
                machine_id=machine_id,
                attribute_key=key,
                value=value,
                created_at=now,
                updated_at=now,
            ))
    await db.commit()

    result = await db.execute(
        select(MachineAttributeValue).where(MachineAttributeValue.machine_id == machine_id)
    )
    rows = result.scalars().all()
    return MachineAttributeValuesOut(values={r.attribute_key: r.value for r in rows})
