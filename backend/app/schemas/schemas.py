from datetime import date, datetime
import json
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from app.models.models import UserRole, MachineStatus, MachineUsageType, AssignmentDepartment, RequestStatus


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
    usage_type: Optional[MachineUsageType] = None
    firmware_version: Optional[str] = None
    image_version: Optional[str] = None
    department: Optional[str] = None


class MachineUpdate(BaseModel):
    model: Optional[str] = None
    description: Optional[str] = None
    status: Optional[MachineStatus] = None
    usage_type: Optional[MachineUsageType] = None
    firmware_version: Optional[str] = None
    image_version: Optional[str] = None
    department: Optional[str] = None


class MachineOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    serial_number: str
    model: str
    description: Optional[str]
    status: MachineStatus
    usage_type: Optional[MachineUsageType]
    firmware_version: Optional[str]
    image_version: Optional[str]
    department: Optional[str] = None
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
    damage_date: Optional[date] = None
    location: Optional[str] = None
    damage_cause: Optional[str] = None
    damage_description: Optional[str] = None
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
    machine_model: Optional[str] = None      # 机器型号要求
    # 需求详情
    remote_operation_needed: bool = False
    dance_needed: bool = False
    dance_source: Optional[str] = None        # existing / custom
    dance_policy_id: Optional[UUID] = None   # legacy single
    dance_policy_ids: Optional[list[UUID]] = None  # multi-select
    group_control_needed: bool = False
    voice_needed: bool = False
    voice_source: Optional[str] = None
    voice_package_id: Optional[UUID] = None  # legacy single
    voice_package_ids: Optional[list[UUID]] = None
    motion_needed: bool = False
    motion_source: Optional[str] = None
    motion_action_id: Optional[UUID] = None  # legacy single
    motion_action_ids: Optional[list[UUID]] = None
    custom_requirements: Optional[str] = None

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
    machine_model: Optional[str] = None
    remote_operation_needed: bool = False
    dance_needed: bool = False
    dance_source: Optional[str] = None
    dance_policy_id: Optional[UUID] = None
    dance_policy_ids: list[str] = []
    group_control_needed: bool = False
    voice_needed: bool = False
    voice_source: Optional[str] = None
    voice_package_id: Optional[UUID] = None
    voice_package_ids: list[str] = []
    motion_needed: bool = False
    motion_source: Optional[str] = None
    motion_action_id: Optional[UUID] = None
    motion_action_ids: list[str] = []
    custom_requirements: Optional[str] = None

    @field_validator('dance_policy_ids', 'voice_package_ids', 'motion_action_ids', mode='before')
    @classmethod
    def parse_json_ids(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v


# ── Resource Library ──────────────────────────

class MachineModelInfoCreate(BaseModel):
    name: str
    description: Optional[str] = None


class MachineModelInfoOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    description: Optional[str]
    created_at: datetime


class DancePolicyCreate(BaseModel):
    name: str
    machine_model: Optional[str] = None
    description: Optional[str] = None
    duration_seconds: Optional[int] = None


class DancePolicyOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    machine_model: Optional[str]
    description: Optional[str]
    duration_seconds: Optional[int]
    created_at: datetime
    updated_at: datetime


class MotionActionCreate(BaseModel):
    name: str
    machine_model: Optional[str] = None
    description: Optional[str] = None


class MotionActionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    machine_model: Optional[str]
    description: Optional[str]
    created_at: datetime
    updated_at: datetime


class VoicePackageCreate(BaseModel):
    name: str
    machine_model: Optional[str] = None
    description: Optional[str] = None


class VoicePackageOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    machine_model: Optional[str]
    description: Optional[str]
    created_at: datetime
    updated_at: datetime


# ── Shipping Request ──────────────────────────

class ShippingRequestCreate(BaseModel):
    requester_name: str
    requester_contact: Optional[str] = None
    destination: str
    is_international: bool = False
    items_tools: Optional[str] = None
    items_accessories: Optional[str] = None
    items_components: Optional[str] = None
    has_battery: bool = False
    battery_international_ok: bool = False
    notes: Optional[str] = None


class ShippingRequestOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    requester_name: str
    requester_contact: Optional[str]
    destination: str
    is_international: bool
    items_tools: Optional[str]
    items_accessories: Optional[str]
    items_components: Optional[str]
    has_battery: bool
    battery_international_ok: bool
    notes: Optional[str]
    attachments: Optional[str]
    status: str
    created_at: datetime


# ── After-Sales Request ───────────────────────

class AfterSalesRequestCreate(BaseModel):
    requester_name: str
    requester_contact: Optional[str] = None
    machine_serial: Optional[str] = None
    machine_model: Optional[str] = None
    issue_type: str = "other"           # hardware / software / other
    issue_description: str
    urgency: str = "normal"             # urgent / normal / low
    notes: Optional[str] = None


class AfterSalesRequestOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    requester_name: str
    requester_contact: Optional[str]
    machine_serial: Optional[str]
    machine_model: Optional[str]
    issue_type: Optional[str]
    issue_description: str
    urgency: str
    notes: Optional[str]
    handled_notes: Optional[str]
    status: str
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
    request_id: Optional[str] = None       # set for marketing events
    maintenance_id: Optional[str] = None   # set for maintenance events


class GanttResource(BaseModel):
    id: str              # machine serial_number
    title: str           # serial_number + model
    status: str


# ── Department ────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str


class DepartmentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    created_at: datetime

