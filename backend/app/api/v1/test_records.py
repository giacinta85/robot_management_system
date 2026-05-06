from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import require_roles
from app.api.v1.audit_helpers import log_action, model_to_dict
from app.core.database import get_db
from app.models.models import TestRecord, Machine, UserRole
from app.schemas.schemas import TestRecordCreate, TestRecordOut, TestRecordUpdate

router = APIRouter(prefix="/test-records", tags=["test-records"])

_READ_ROLES = (UserRole.admin, UserRole.rd_test)
_WRITE_ROLES = (UserRole.admin, UserRole.rd_test)


@router.get("", response_model=list[TestRecordOut])
async def list_test_records(
    machine_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_READ_ROLES)),
):
    q = select(TestRecord).order_by(TestRecord.start_date.desc())
    if machine_id:
        q = q.where(TestRecord.machine_id == machine_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=TestRecordOut, status_code=status.HTTP_201_CREATED)
async def create_test_record(
    body: TestRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(*_WRITE_ROLES)),
):
    machine = await db.get(Machine, body.machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    record = TestRecord(**body.model_dump(), created_by=current_user.id)
    db.add(record)
    await db.flush()
    await log_action(
        db,
        user_id=str(current_user.id),
        username=current_user.username,
        table_name="test_records",
        record_id=str(record.id),
        operation="create",
        before=None,
        after=model_to_dict(record),
        description=f"创建测试记录（机器: {machine.serial_number}, 项目: {body.project_name}）",
    )
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/{record_id}", response_model=TestRecordOut)
async def get_test_record(
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_READ_ROLES)),
):
    record = await db.get(TestRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.patch("/{record_id}", response_model=TestRecordOut)
async def update_test_record(
    record_id: UUID,
    body: TestRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(*_WRITE_ROLES)),
):
    record = await db.get(TestRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    before = model_to_dict(record)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    await log_action(
        db,
        user_id=str(current_user.id),
        username=current_user.username,
        table_name="test_records",
        record_id=str(record.id),
        operation="update",
        before=before,
        after=model_to_dict(record),
        description=f"更新测试记录 {record.id}",
    )
    await db.commit()
    await db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_record(
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.admin)),
):
    record = await db.get(TestRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    before = model_to_dict(record)
    await log_action(
        db,
        user_id=str(current_user.id),
        username=current_user.username,
        table_name="test_records",
        record_id=str(record.id),
        operation="delete",
        before=before,
        after=None,
        description=f"删除测试记录 {record.id}",
    )
    await db.delete(record)
    await db.commit()
