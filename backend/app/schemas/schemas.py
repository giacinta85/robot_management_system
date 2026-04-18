from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from app.models.models import UserRole, MachineStatus, AssignmentDepartment, RequestStatus


# ── Auth ──────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: UUID
    full_name: Optional[str] = None


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.marketing


class UserOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    username: str
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime


# ── Machine ───────────────────────────────────

class MachineCreate(BaseModel):
    serial_number: str
    model: str
    description: Optional[str] = None
    status: MachineStatus = MachineStatus.idle
    purchased_at: Optional[date] = None


class MachineUpdate(BaseModel):
    model: Optional[str] = None
    description: Optional[str] = None
    status: Optional[MachineStatus] = None
    purchased_at: Optional[date] = None


class MachineOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    serial_number: str
    model: str
    description: Optional[str]
    status: MachineStatus
    purchased_at: Optional[date]
    created_at: datetime


# ── Assignment ────────────────────────────────

class AssignmentCreate(BaseModel):
    machine_id: UUID
    department: AssignmentDepartment
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None


class AssignmentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    machine_id: UUID
    department: AssignmentDepartment
    start_date: date
    end_date: Optional[date]
    notes: Optional[str]
    created_at: datetime


# ── Maintenance ───────────────────────────────

class MaintenanceCreate(BaseModel):
    machine_id: UUID
    location: Optional[str] = None
    damage_date: date
    damage_cause: str
    damage_description: str
    repair_detail: Optional[str] = None
    repair_start_date: Optional[date] = None
    repair_end_date: Optional[date] = None


class MaintenanceUpdate(BaseModel):
    repair_detail: Optional[str] = None
    repair_start_date: Optional[date] = None
    repair_end_date: Optional[date] = None
    is_resolved: Optional[bool] = None


class MaintenanceOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    machine_id: UUID
    location: Optional[str]
    damage_date: date
    damage_cause: str
    damage_description: str
    repair_detail: Optional[str]
    repair_start_date: Optional[date]
    repair_end_date: Optional[date]
    is_resolved: bool
    created_at: datetime
    updated_at: datetime


# ── Marketing Request ─────────────────────────

class MarketingRequestCreate(BaseModel):
    requester_name: str
    requester_contact: Optional[str] = None
    event_name: str
    location: str
    start_date: date
    end_date: date
    quantity_needed: int
    notes: Optional[str] = None

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v, info):
        if info.data.get("start_date") and v < info.data["start_date"]:
            raise ValueError("end_date must be >= start_date")
        return v


class MarketingRequestReview(BaseModel):
    status: RequestStatus
    machine_ids: Optional[list[UUID]] = None  # 审批通过时分配的机器


class MarketingRequestOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    requester_name: str
    requester_contact: Optional[str]
    event_name: str
    location: str
    start_date: date
    end_date: date
    quantity_needed: int
    notes: Optional[str]
    status: RequestStatus
    created_at: datetime


# ── Availability (Gantt) ──────────────────────

class GanttEvent(BaseModel):
    id: str
    resourceId: str      # machine serial_number
    title: str
    start: str           # ISO date
    end: str             # ISO date
    color: str
    type: str            # assignment / maintenance / marketing


class GanttResource(BaseModel):
    id: str              # machine serial_number
    title: str           # serial_number + model
    status: str
