import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, ForeignKey,
    Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


# ──────────────────────────────────────────
# Enums
# ──────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    rd_test = "rd_test"          # 研发/测试
    maintenance = "maintenance"  # 维修技术员
    marketing = "marketing"      # 市场人员


class MachineStatus(str, enum.Enum):
    idle = "idle"
    in_use = "in_use"
    under_repair = "under_repair"
    retired = "retired"


class AssignmentDepartment(str, enum.Enum):
    rd = "rd"
    test = "test"
    marketing = "marketing"


class RequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


# ──────────────────────────────────────────
# Tables
# ──────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(64), unique=True, nullable=False, index=True)
    hashed_password = Column(String(128), nullable=False)
    full_name = Column(String(128))
    role = Column(Enum(UserRole), nullable=False, default=UserRole.marketing)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class Machine(Base):
    __tablename__ = "machines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    serial_number = Column(String(64), unique=True, nullable=False, index=True)
    model = Column(String(128), nullable=False)
    description = Column(Text)
    status = Column(Enum(MachineStatus), nullable=False, default=MachineStatus.idle)
    purchased_at = Column(Date)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    assignments = relationship("MachineAssignment", back_populates="machine", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="machine", cascade="all, delete-orphan")
    allocations = relationship("MarketingAllocation", back_populates="machine")


class MachineAssignment(Base):
    """机器使用分配记录（研发/测试/市场）"""
    __tablename__ = "machine_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id"), nullable=False)
    department = Column(Enum(AssignmentDepartment), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow)

    machine = relationship("Machine", back_populates="assignments")


class MaintenanceRecord(Base):
    """维修记录"""
    __tablename__ = "maintenance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id"), nullable=False)
    location = Column(String(256))                # 维修/损坏地点
    damage_date = Column(Date, nullable=False)
    damage_cause = Column(Text, nullable=False)
    damage_description = Column(Text, nullable=False)
    repair_detail = Column(Text)
    repair_start_date = Column(Date)
    repair_end_date = Column(Date)  # 修好时间（填写后机器可重新投入使用）
    technician_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    machine = relationship("Machine", back_populates="maintenance_records")


class MarketingRequest(Base):
    """市场需求申请单（可公开提交，无需登录）"""
    __tablename__ = "marketing_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_name = Column(String(128), nullable=False)
    requester_contact = Column(String(128))     # 手机/邮箱
    event_name = Column(String(256), nullable=False)
    location = Column(String(256), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    quantity_needed = Column(Integer, nullable=False)
    notes = Column(Text)
    status = Column(Enum(RequestStatus), nullable=False, default=RequestStatus.pending)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    reviewed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow)

    allocations = relationship("MarketingAllocation", back_populates="request", cascade="all, delete-orphan")


class MarketingAllocation(Base):
    """申请单与机器的对应关系"""
    __tablename__ = "marketing_allocations"
    __table_args__ = (UniqueConstraint("request_id", "machine_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("marketing_requests.id"), nullable=False)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    request = relationship("MarketingRequest", back_populates="allocations")
    machine = relationship("Machine", back_populates="allocations")
