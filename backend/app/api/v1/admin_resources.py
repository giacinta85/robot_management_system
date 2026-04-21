"""Admin-managed resource library: machine models, dance policies, motion actions, voice packages."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel as PydanticModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.models import MachineModelInfo, DancePolicy, MotionAction, VoicePackage, SystemFeature, Department, UserRole
from app.schemas.schemas import (
    MachineModelInfoCreate, MachineModelInfoOut,
    DancePolicyCreate, DancePolicyOut,
    MotionActionCreate, MotionActionOut,
    VoicePackageCreate, VoicePackageOut,
    DepartmentCreate, DepartmentOut,
)

router = APIRouter(prefix="/admin", tags=["admin-resources"])


# ── Machine Models ────────────────────────────

@router.get("/machine-models", response_model=list[MachineModelInfoOut])
async def list_machine_models(db: AsyncSession = Depends(get_db)):
    """公开可读（申请表需要型号列表）"""
    result = await db.execute(select(MachineModelInfo).order_by(MachineModelInfo.name))
    return result.scalars().all()


@router.post("/machine-models", response_model=MachineModelInfoOut, status_code=201)
async def create_machine_model(
    body: MachineModelInfoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = MachineModelInfo(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/machine-models/{obj_id}", response_model=MachineModelInfoOut)
async def update_machine_model(
    obj_id: UUID,
    body: MachineModelInfoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(MachineModelInfo, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/machine-models/{obj_id}", status_code=204)
async def delete_machine_model(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(MachineModelInfo, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(obj)
    await db.commit()


# ── Dance Policies ────────────────────────────

@router.get("/dance-policies", response_model=list[DancePolicyOut])
async def list_dance_policies(machine_model: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(DancePolicy).order_by(DancePolicy.name)
    if machine_model:
        q = q.where(DancePolicy.machine_model == machine_model)
    return (await db.execute(q)).scalars().all()


@router.post("/dance-policies", response_model=DancePolicyOut, status_code=201)
async def create_dance_policy(
    body: DancePolicyCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    from datetime import datetime, timezone
    obj = DancePolicy(**body.model_dump(), created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/dance-policies/{obj_id}", response_model=DancePolicyOut)
async def update_dance_policy(
    obj_id: UUID,
    body: DancePolicyCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(DancePolicy, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/dance-policies/{obj_id}", status_code=204)
async def delete_dance_policy(
    obj_id: UUID, db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(DancePolicy, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(obj)
    await db.commit()


# ── Motion Actions ────────────────────────────

@router.get("/motion-actions", response_model=list[MotionActionOut])
async def list_motion_actions(machine_model: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(MotionAction).order_by(MotionAction.name)
    if machine_model:
        q = q.where(MotionAction.machine_model == machine_model)
    return (await db.execute(q)).scalars().all()


@router.post("/motion-actions", response_model=MotionActionOut, status_code=201)
async def create_motion_action(
    body: MotionActionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    from datetime import datetime, timezone
    obj = MotionAction(**body.model_dump(), created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/motion-actions/{obj_id}", response_model=MotionActionOut)
async def update_motion_action(
    obj_id: UUID,
    body: MotionActionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(MotionAction, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/motion-actions/{obj_id}", status_code=204)
async def delete_motion_action(
    obj_id: UUID, db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(MotionAction, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(obj)
    await db.commit()


# ── Voice Packages ────────────────────────────

@router.get("/voice-packages", response_model=list[VoicePackageOut])
async def list_voice_packages(machine_model: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(VoicePackage).order_by(VoicePackage.name)
    if machine_model:
        q = q.where(VoicePackage.machine_model == machine_model)
    return (await db.execute(q)).scalars().all()


@router.post("/voice-packages", response_model=VoicePackageOut, status_code=201)
async def create_voice_package(
    body: VoicePackageCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    from datetime import datetime, timezone
    obj = VoicePackage(**body.model_dump(), created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/voice-packages/{obj_id}", response_model=VoicePackageOut)
async def update_voice_package(
    obj_id: UUID,
    body: VoicePackageCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(VoicePackage, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/voice-packages/{obj_id}", status_code=204)
async def delete_voice_package(
    obj_id: UUID, db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(VoicePackage, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(obj)
    await db.commit()


# ── Feature Flags ─────────────────────────────

FEATURE_KEYS = ["remote_operation", "dance", "voice", "motion", "group_control"]


class FeaturesUpdate(PydanticModel):
    remote_operation: bool = True
    dance: bool = True
    voice: bool = True
    motion: bool = True
    group_control: bool = True


@router.get("/features")
async def get_features(db: AsyncSession = Depends(get_db)):
    """公开可读，申请表需要读取功能开关状态"""
    result = await db.execute(select(SystemFeature))
    rows = {r.key: r.enabled for r in result.scalars()}
    return {k: rows.get(k, True) for k in FEATURE_KEYS}


@router.put("/features")
async def update_features(
    body: FeaturesUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    data = body.model_dump()
    for k, v in data.items():
        obj = await db.get(SystemFeature, k)
        if obj:
            obj.enabled = v
        else:
            obj = SystemFeature(key=k, enabled=v)
            db.add(obj)
    await db.commit()
    return data


# ── Departments ─────────────────────────────────

@router.get("/departments", response_model=list[DepartmentOut])
async def list_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()


@router.post("/departments", response_model=DepartmentOut, status_code=201)
async def create_department(
    body: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = Department(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/departments/{obj_id}", status_code=204)
async def delete_department(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(Department, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(obj)
    await db.commit()
