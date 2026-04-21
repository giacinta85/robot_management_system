"""Admin audit log: list and revert operations."""
import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.models import (
    AuditLog, UserRole,
    Machine, MarketingRequest, MaintenanceRecord,
    DancePolicy, MotionAction, VoicePackage, MachineModelInfo, Department,
    MarketingAllocation, MachineAssignment, AssignmentDepartment, RequestStatus,
)

router = APIRouter(prefix="/admin/audit", tags=["audit"])

# Map table_name → SQLAlchemy model (for UPDATE revert and CREATE revert)
_MODEL_MAP = {
    "machines": Machine,
    "marketing_requests": MarketingRequest,
    "maintenance_records": MaintenanceRecord,
    "dance_policies": DancePolicy,
    "motion_actions": MotionAction,
    "voice_packages": VoicePackage,
    "machine_model_infos": MachineModelInfo,
    "departments": Department,
}

# Columns that should be skipped when reverting (auto-managed)
_SKIP_COLS = {"created_at", "updated_at", "id"}


class AuditLogOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    username: str | None
    table_name: str
    record_id: str
    operation: str
    description: str | None
    before_data: str | None
    after_data: str | None
    reverted: bool
    created_at: str

    @classmethod
    def from_orm_obj(cls, obj: AuditLog):
        return cls(
            id=str(obj.id),
            username=obj.username,
            table_name=obj.table_name,
            record_id=obj.record_id,
            operation=obj.operation,
            description=obj.description,
            before_data=obj.before_data,
            after_data=obj.after_data,
            reverted=obj.reverted or False,
            created_at=obj.created_at.isoformat() if obj.created_at else "",
        )


@router.get("/logs")
async def list_audit_logs(
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    )
    return [AuditLogOut.from_orm_obj(r) for r in result.scalars()]


@router.post("/logs/{log_id}/revert")
async def revert_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(UserRole.admin)),
):
    log = await db.get(AuditLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    if log.reverted:
        raise HTTPException(status_code=400, detail="该操作已回退，不可重复回退")

    model_cls = _MODEL_MAP.get(log.table_name)
    op = log.operation

    if op == "update":
        if not log.before_data:
            # 特殊处理：审批操作无 before_data，通过 after_data 反推回退
            if log.table_name == "marketing_requests" and log.after_data and model_cls:
                after = json.loads(log.after_data)
                after_status = after.get("status")
                try:
                    record_uuid = UUID(log.record_id)
                except ValueError:
                    raise HTTPException(status_code=400, detail="record_id 格式错误")
                record = await db.get(MarketingRequest, record_uuid)
                if not record:
                    raise HTTPException(status_code=404, detail="原记录不存在，可能已被删除")
                # 如果是已批准状态的回退，清除分配
                if after_status == "approved":
                    alloc_q = select(MarketingAllocation).where(
                        MarketingAllocation.request_id == record_uuid
                    )
                    allocations = (await db.execute(alloc_q)).scalars().all()
                    machine_ids = [a.machine_id for a in allocations]
                    if machine_ids:
                        assign_q = select(MachineAssignment).where(
                            MachineAssignment.machine_id.in_(machine_ids),
                            MachineAssignment.department == AssignmentDepartment.marketing,
                            MachineAssignment.start_date == record.start_date,
                            MachineAssignment.end_date == record.end_date,
                        )
                        for assignment in (await db.execute(assign_q)).scalars().all():
                            await db.delete(assignment)
                    for a in allocations:
                        await db.delete(a)
                record.status = RequestStatus.pending
                record.reviewed_by = None
                record.reviewed_at = None
                log.reverted = True
                await db.commit()
                return {"ok": True, "message": "审批已回退，申请状态恢复为待审批"}
            raise HTTPException(status_code=400, detail="无 before_data，无法回退")
        if not model_cls:
            raise HTTPException(status_code=400, detail=f"表 {log.table_name} 不支持回退")
        before = json.loads(log.before_data)
        # Parse record UUID properly
        try:
            record_uuid = UUID(log.record_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="record_id 格式错误")
        record = await db.get(model_cls, record_uuid)
        if not record:
            raise HTTPException(status_code=404, detail="原记录不存在，可能已被删除")
        for k, v in before.items():
            if k in _SKIP_COLS:
                continue
            try:
                setattr(record, k, v)
            except Exception:
                pass
        log.reverted = True
        await db.commit()
        return {"ok": True, "message": "UPDATE 已回退至之前状态"}

    elif op == "create":
        if not model_cls:
            raise HTTPException(status_code=400, detail=f"表 {log.table_name} 不支持回退")
        try:
            record_uuid = UUID(log.record_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="record_id 格式错误")
        record = await db.get(model_cls, record_uuid)
        if not record:
            raise HTTPException(status_code=404, detail="记录不存在（可能已被删除）")
        await db.delete(record)
        log.reverted = True
        await db.commit()
        return {"ok": True, "message": "CREATE 已回退（记录已删除）"}

    elif op == "delete":
        if not log.before_data:
            raise HTTPException(status_code=400, detail="无 before_data，无法回退删除")
        if not model_cls:
            raise HTTPException(status_code=400, detail=f"表 {log.table_name} 不支持回退")
        before = json.loads(log.before_data)
        # Re-insert record with original data
        try:
            record_uuid = UUID(log.record_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="record_id 格式错误")
        existing = await db.get(model_cls, record_uuid)
        if existing:
            raise HTTPException(status_code=400, detail="记录已存在，无需回退")
        new_obj = model_cls()
        for k, v in before.items():
            if k in _SKIP_COLS - {"id"}:
                continue
            try:
                setattr(new_obj, k, v)
            except Exception:
                pass
        db.add(new_obj)
        log.reverted = True
        await db.commit()
        return {"ok": True, "message": "DELETE 已回退（记录已恢复）"}

    else:
        raise HTTPException(status_code=400, detail=f"不支持回退操作类型: {op}")
