"""Admin-managed resource library: machine models, dance policies, motion actions, voice packages."""
import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel as PydanticModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import require_roles
from app.api.v1.audit_helpers import log_action, model_to_dict
from app.core.database import get_db
from app.models.models import (
    MachineModelInfo, DancePolicy, MotionAction, VoicePackage, SystemFeature, Department,
    DamageCausePreset, MotorFirmwareVersion, PowerBoardVersion, SystemImageVersion, UserRole,
    MachineAttributeDefinition,
)
from app.schemas.schemas import (
    MachineModelInfoCreate, MachineModelInfoOut,
    DancePolicyCreate, DancePolicyOut,
    MotionActionCreate, MotionActionOut,
    VoicePackageCreate, VoicePackageOut,
    DepartmentCreate, DepartmentUpdate, DepartmentOut,
    DamageCausePresetCreate, DamageCausePresetOut,
    MotorFirmwareVersionCreate, MotorFirmwareVersionOut,
    PowerBoardVersionCreate, PowerBoardVersionOut,
    SystemImageVersionCreate, SystemImageVersionOut,
    MachineAttributeDefinitionCreate, MachineAttributeDefinitionUpdate, MachineAttributeDefinitionOut,
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
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = MachineModelInfo(**body.model_dump())
    db.add(obj)
    await db.flush()
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="machine_model_infos", record_id=str(obj.id), operation="create",
        before=None, after=model_to_dict(obj), description=f"新增机器型号 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/machine-models/{obj_id}", response_model=MachineModelInfoOut)
async def update_machine_model(
    obj_id: UUID,
    body: MachineModelInfoCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(MachineModelInfo, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="machine_model_infos", record_id=str(obj.id), operation="update",
        before=before, after=model_to_dict(obj), description=f"修改机器型号 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/machine-models/{obj_id}", status_code=204)
async def delete_machine_model(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(MachineModelInfo, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="machine_model_infos", record_id=str(obj.id), operation="delete",
        before=before, after=None, description=f"删除机器型号 {obj.name}")
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
    current_user=Depends(require_roles(UserRole.admin)),
):
    from datetime import datetime, timezone
    obj = DancePolicy(**body.model_dump(), created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    db.add(obj)
    await db.flush()
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="dance_policies", record_id=str(obj.id), operation="create",
        before=None, after=model_to_dict(obj), description=f"新增舞蹈策略 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/dance-policies/{obj_id}", response_model=DancePolicyOut)
async def update_dance_policy(
    obj_id: UUID,
    body: DancePolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(DancePolicy, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="dance_policies", record_id=str(obj.id), operation="update",
        before=before, after=model_to_dict(obj), description=f"修改舞蹈策略 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/dance-policies/{obj_id}", status_code=204)
async def delete_dance_policy(
    obj_id: UUID, db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(DancePolicy, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="dance_policies", record_id=str(obj.id), operation="delete",
        before=before, after=None, description=f"删除舞蹈策略 {obj.name}")
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
    current_user=Depends(require_roles(UserRole.admin)),
):
    from datetime import datetime, timezone
    obj = MotionAction(**body.model_dump(), created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    db.add(obj)
    await db.flush()
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="motion_actions", record_id=str(obj.id), operation="create",
        before=None, after=model_to_dict(obj), description=f"新增动作集 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/motion-actions/{obj_id}", response_model=MotionActionOut)
async def update_motion_action(
    obj_id: UUID,
    body: MotionActionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(MotionAction, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="motion_actions", record_id=str(obj.id), operation="update",
        before=before, after=model_to_dict(obj), description=f"修改动作集 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/motion-actions/{obj_id}", status_code=204)
async def delete_motion_action(
    obj_id: UUID, db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(MotionAction, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="motion_actions", record_id=str(obj.id), operation="delete",
        before=before, after=None, description=f"删除动作集 {obj.name}")
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
    current_user=Depends(require_roles(UserRole.admin)),
):
    from datetime import datetime, timezone
    obj = VoicePackage(**body.model_dump(), created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    db.add(obj)
    await db.flush()
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="voice_packages", record_id=str(obj.id), operation="create",
        before=None, after=model_to_dict(obj), description=f"新增语音包 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/voice-packages/{obj_id}", response_model=VoicePackageOut)
async def update_voice_package(
    obj_id: UUID,
    body: VoicePackageCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(VoicePackage, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="voice_packages", record_id=str(obj.id), operation="update",
        before=before, after=model_to_dict(obj), description=f"修改语音包 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/voice-packages/{obj_id}", status_code=204)
async def delete_voice_package(
    obj_id: UUID, db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(VoicePackage, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="voice_packages", record_id=str(obj.id), operation="delete",
        before=before, after=None, description=f"删除语音包 {obj.name}")
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
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = Department(**body.model_dump())
    db.add(obj)
    await db.flush()
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="departments", record_id=str(obj.id), operation="create",
        before=None, after=model_to_dict(obj), description=f"新增部门 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/departments/{obj_id}", status_code=204)
async def delete_department(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(Department, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="departments", record_id=str(obj.id), operation="delete",
        before=before, after=None, description=f"删除部门 {obj.name}")
    await db.delete(obj)
    await db.commit()


@router.patch("/departments/{obj_id}", response_model=DepartmentOut)
async def update_department(
    obj_id: UUID,
    body: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(Department, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    obj.name = body.name
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="departments", record_id=str(obj.id), operation="update",
        before=before, after=model_to_dict(obj), description=f"更新部门名称 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


# ── DamageCausePresets ───────────────────────────────────────

@router.get("/damage-cause-presets", response_model=list[DamageCausePresetOut])
async def list_damage_cause_presets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DamageCausePreset).order_by(DamageCausePreset.name))
    return result.scalars().all()


@router.post("/damage-cause-presets", response_model=DamageCausePresetOut, status_code=201)
async def create_damage_cause_preset(
    body: DamageCausePresetCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = DamageCausePreset(**body.model_dump())
    db.add(obj)
    await db.flush()
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="damage_cause_presets", record_id=str(obj.id), operation="create",
        before=None, after=model_to_dict(obj), description=f"新增损坏原因预设 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/damage-cause-presets/{obj_id}", response_model=DamageCausePresetOut)
async def update_damage_cause_preset(
    obj_id: UUID,
    body: DamageCausePresetCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(DamageCausePreset, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    obj.name = body.name
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="damage_cause_presets", record_id=str(obj.id), operation="update",
        before=before, after=model_to_dict(obj), description=f"更新损坏原因预设 {obj.name}")
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/damage-cause-presets/{obj_id}", status_code=204)
async def delete_damage_cause_preset(
    obj_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(DamageCausePreset, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    before = model_to_dict(obj)
    await log_action(db, user_id=str(current_user.id), username=current_user.username,
        table_name="damage_cause_presets", record_id=str(obj.id), operation="delete",
        before=before, after=None, description=f"删除损坏原因预设 {obj.name}")
    await db.delete(obj)
    await db.commit()


# ── Firmware / Image Version Library (generic CRUD) ──────────────────────────

def _make_version_router(
    Model, table_name: str, display_name: str,
    CreateSchema, OutSchema,
    path: str,
):
    """Register CRUD routes for a firmware/image version resource type."""

    @router.get(path, response_model=list[OutSchema])
    async def _list(machine_model: str | None = None, db: AsyncSession = Depends(get_db)):
        q = select(Model).order_by(Model.name)
        if machine_model:
            q = q.where(Model.machine_model == machine_model)
        return (await db.execute(q)).scalars().all()

    @router.post(path, response_model=OutSchema, status_code=201)
    async def _create(
        body: CreateSchema,
        db: AsyncSession = Depends(get_db),
        current_user=Depends(require_roles(UserRole.admin)),
    ):
        now = datetime.now(timezone.utc)
        obj = Model(**body.model_dump(), created_at=now, updated_at=now)
        db.add(obj)
        await db.flush()
        await log_action(db, user_id=str(current_user.id), username=current_user.username,
            table_name=table_name, record_id=str(obj.id), operation="create",
            before=None, after=model_to_dict(obj), description=f"新增{display_name} {obj.name}")
        await db.commit()
        await db.refresh(obj)
        return obj

    @router.put(path + "/{obj_id}", response_model=OutSchema)
    async def _update(
        obj_id: UUID, body: CreateSchema,
        db: AsyncSession = Depends(get_db),
        current_user=Depends(require_roles(UserRole.admin)),
    ):
        obj = await db.get(Model, obj_id)
        if not obj:
            raise HTTPException(status_code=404, detail="Not found")
        before = model_to_dict(obj)
        for k, v in body.model_dump().items():
            setattr(obj, k, v)
        obj.updated_at = datetime.now(timezone.utc)
        await log_action(db, user_id=str(current_user.id), username=current_user.username,
            table_name=table_name, record_id=str(obj.id), operation="update",
            before=before, after=model_to_dict(obj), description=f"修改{display_name} {obj.name}")
        await db.commit()
        await db.refresh(obj)
        return obj

    @router.delete(path + "/{obj_id}", status_code=204)
    async def _delete(
        obj_id: UUID,
        db: AsyncSession = Depends(get_db),
        current_user=Depends(require_roles(UserRole.admin)),
    ):
        obj = await db.get(Model, obj_id)
        if not obj:
            raise HTTPException(status_code=404, detail="Not found")
        before = model_to_dict(obj)
        await log_action(db, user_id=str(current_user.id), username=current_user.username,
            table_name=table_name, record_id=str(obj.id), operation="delete",
            before=before, after=None, description=f"删除{display_name} {obj.name}")
        await db.delete(obj)
        await db.commit()


_make_version_router(
    MotorFirmwareVersion, "motor_firmware_versions", "电机固件版本",
    MotorFirmwareVersionCreate, MotorFirmwareVersionOut,
    "/motor-firmware-versions",
)
_make_version_router(
    PowerBoardVersion, "power_board_versions", "电源板版本",
    PowerBoardVersionCreate, PowerBoardVersionOut,
    "/power-board-versions",
)
_make_version_router(
    SystemImageVersion, "system_image_versions", "系统镜像版本",
    SystemImageVersionCreate, SystemImageVersionOut,
    "/system-image-versions",
)


# ── Machine Attribute Definitions ─────────────────────────────────────────────

def _attr_to_out(obj: MachineAttributeDefinition) -> dict:
    return {
        "id": str(obj.id),
        "field_key": obj.field_key,
        "display_name": obj.display_name,
        "field_type": obj.field_type,
        "is_system": obj.is_system,
        "preset_values": json.loads(obj.preset_values or "[]"),
        "display_order": obj.display_order,
    }


@router.get("/attribute-definitions", response_model=list[MachineAttributeDefinitionOut])
async def list_attribute_definitions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MachineAttributeDefinition).order_by(
            MachineAttributeDefinition.display_order,
            MachineAttributeDefinition.created_at,
        )
    )
    rows = result.scalars().all()
    return [MachineAttributeDefinitionOut(**_attr_to_out(r)) for r in rows]


@router.post("/attribute-definitions", response_model=MachineAttributeDefinitionOut, status_code=201)
async def create_attribute_definition(
    body: MachineAttributeDefinitionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    existing = await db.execute(
        select(MachineAttributeDefinition).where(
            MachineAttributeDefinition.field_key == body.field_key
        )
    )
    if existing.scalar():
        raise HTTPException(status_code=400, detail="字段键已存在")
    obj = MachineAttributeDefinition(
        field_key=body.field_key,
        display_name=body.display_name,
        field_type=body.field_type,
        is_system=False,
        preset_values=json.dumps(body.preset_values, ensure_ascii=False),
        display_order=body.display_order,
        created_at=datetime.now(timezone.utc),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return MachineAttributeDefinitionOut(**_attr_to_out(obj))


@router.patch("/attribute-definitions/{attr_id}", response_model=MachineAttributeDefinitionOut)
async def update_attribute_definition(
    attr_id: UUID,
    body: MachineAttributeDefinitionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(MachineAttributeDefinition, attr_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    if body.display_name is not None:
        obj.display_name = body.display_name
    if body.field_type is not None:
        obj.field_type = body.field_type
    if body.preset_values is not None:
        obj.preset_values = json.dumps(body.preset_values, ensure_ascii=False)
    if body.display_order is not None:
        obj.display_order = body.display_order
    await db.commit()
    await db.refresh(obj)
    return MachineAttributeDefinitionOut(**_attr_to_out(obj))


@router.delete("/attribute-definitions/{attr_id}", status_code=204)
async def delete_attribute_definition(
    attr_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    obj = await db.get(MachineAttributeDefinition, attr_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    if obj.is_system:
        raise HTTPException(status_code=400, detail="系统内置字段不可删除")
    await db.delete(obj)
    await db.commit()

