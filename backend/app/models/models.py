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


class MachineUsageType(str, enum.Enum):
    motion_control = "motion_control"  # 运控
    testing = "testing"               # 测试
    software = "software"              # 软件
    marketing = "marketing"            # 市场


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
    usage_type = Column(Enum(MachineUsageType), nullable=True)
    firmware_version = Column(String(128), nullable=True)
    image_version = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    assignments = relationship("MachineAssignment", back_populates="machine", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="machine", cascade="all, delete-orphan")
    test_records = relationship("TestRecord", back_populates="machine", cascade="all, delete-orphan")
    allocations = relationship("MarketingAllocation", back_populates="machine")
    resource_links = relationship("MachineResourceLink", back_populates="machine", cascade="all, delete-orphan")
    department = Column(String(64), nullable=True)  # stores department name


class MachineAssignment(Base):
    """机器使用分配记录（研发/测试/市场）"""
    __tablename__ = "machine_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id"), nullable=False)
    department = Column(Enum(AssignmentDepartment), nullable=False)
    project_name = Column(String(256), nullable=True)   # 项目名称
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
    # ── 需求详情 ──────────────────────────────────
    remote_operation_needed = Column(Boolean, default=False)   # 是否需要遥操
    dance_needed = Column(Boolean, default=False)              # 是否需要舞蹈
    dance_source = Column(String(32))                          # existing / custom
    dance_policy_id = Column(UUID(as_uuid=True), ForeignKey("dance_policies.id"), nullable=True)
    group_control_needed = Column(Boolean, default=False)      # 是否需要群控
    voice_needed = Column(Boolean, default=False)              # 语音需求
    voice_source = Column(String(32))                          # existing / custom
    voice_package_id = Column(UUID(as_uuid=True), ForeignKey("voice_packages.id"), nullable=True)
    motion_needed = Column(Boolean, default=False)             # 动作需求
    motion_source = Column(String(32))                         # existing / custom
    motion_action_id = Column(UUID(as_uuid=True), ForeignKey("motion_actions.id"), nullable=True)
    custom_requirements = Column(Text)                         # 定制需求描述
    # ── 多选资源 ID（JSON 字符串，e.g. '["uuid1","uuid2"]'）────────
    machine_model = Column(String(64), nullable=True)          # 申请指定的机器型号
    dance_policy_ids = Column(Text, nullable=True)             # JSON list of dance policy UUIDs
    voice_package_ids = Column(Text, nullable=True)            # JSON list of voice package UUIDs
    motion_action_ids = Column(Text, nullable=True)            # JSON list of motion action UUIDs
    # ─────────────────────────────────────────────
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


# ──────────────────────────────────────────
# Resource library (admin-managed)
# ──────────────────────────────────────────

class MachineModelInfo(Base):
    """机器型号信息（可在网页端维护）"""
    __tablename__ = "machine_model_infos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(64), unique=True, nullable=False)   # NIX2 / NIX2.5 / LUS2 / LUS3
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class DancePolicy(Base):
    """舞蹈 policy 表"""
    __tablename__ = "dance_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(256), nullable=False)
    machine_model = Column(String(64))          # 对应机器型号
    description = Column(Text)
    duration_seconds = Column(Integer)           # 时长（秒）
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class MotionAction(Base):
    """动作库表"""
    __tablename__ = "motion_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(256), nullable=False)
    machine_model = Column(String(64))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class VoicePackage(Base):
    """语音包表"""
    __tablename__ = "voice_packages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(256), nullable=False)
    machine_model = Column(String(64))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class SystemFeature(Base):
    """功能开关配置 (remote_operation / dance / voice / motion / group_control)"""
    __tablename__ = "system_features"

    key = Column(String(64), primary_key=True)
    enabled = Column(Boolean, nullable=False, default=True)


class Department(Base):
    """可配置的部门选项"""
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(64), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class DamageCausePreset(Base):
    """维修记录损坏原因预设（可在资源库中管理）"""
    __tablename__ = "damage_cause_presets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(128), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


# ──────────────────────────────────────────
# Firmware / Image version library
# ──────────────────────────────────────────

class ResourceLinkType(str, enum.Enum):
    motor_firmware = "motor_firmware"
    power_board = "power_board"
    system_image = "system_image"


class MotorFirmwareVersion(Base):
    """电机固件版本库"""
    __tablename__ = "motor_firmware_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(256), nullable=False)
    machine_model = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class PowerBoardVersion(Base):
    """电源板版本库"""
    __tablename__ = "power_board_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(256), nullable=False)
    machine_model = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class SystemImageVersion(Base):
    """系统镜像版本库"""
    __tablename__ = "system_image_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(256), nullable=False)
    machine_model = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class MachineResourceLink(Base):
    """机器与版本资源的关联表（多对多）"""
    __tablename__ = "machine_resource_links"
    __table_args__ = (UniqueConstraint("machine_id", "resource_type", "resource_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    resource_type = Column(Enum(ResourceLinkType), nullable=False)
    resource_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    machine = relationship("Machine", back_populates="resource_links")


class TestStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"
    paused = "paused"


class TestRecord(Base):
    """测试记录"""
    __tablename__ = "test_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id"), nullable=False)
    project_name = Column(String(256), nullable=False)          # 项目名称
    test_purpose = Column(Text, nullable=False)                 # 测试目的
    test_method = Column(Text)                                  # 如何测试
    test_result = Column(Text)                                  # 测试结果
    tester = Column(String(128))                                # 负责人
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    status = Column(Enum(TestStatus), nullable=False, default=TestStatus.in_progress)
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    machine = relationship("Machine", back_populates="test_records")


class AuditLog(Base):
    """管理员操作日志（支持回退）"""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    username = Column(String(64), nullable=True)          # snapshot at write time
    table_name = Column(String(64), nullable=False)       # e.g. machines
    record_id = Column(String(64), nullable=False)        # str(uuid)
    operation = Column(String(16), nullable=False)        # create / update / delete
    before_data = Column(Text, nullable=True)             # JSON
    after_data = Column(Text, nullable=True)              # JSON
    description = Column(String(256), nullable=True)      # human-readable summary
    reverted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

# ──────────────────────────────────────────
# Shipping & After-Sales
# ──────────────────────────────────────────

class ShippingRequest(Base):
    """发货需求"""
    __tablename__ = "shipping_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_name = Column(String(128), nullable=False)
    requester_contact = Column(String(128))
    destination = Column(String(256), nullable=False)
    is_international = Column(Boolean, default=False)
    items_tools = Column(Text)          # 工具清单
    items_accessories = Column(Text)    # 配件清单
    items_components = Column(Text)     # 组件清单
    has_battery = Column(Boolean, default=False)
    battery_international_ok = Column(Boolean, default=False)
    notes = Column(Text)
    attachments = Column(Text)          # JSON: [{name, url}]
    status = Column(String(32), default="pending")  # pending/processing/shipped/cancelled
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class AfterSalesRequest(Base):
    """售后需求"""
    __tablename__ = "after_sales_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_name = Column(String(128), nullable=False)
    requester_contact = Column(String(128))
    machine_serial = Column(String(64))
    machine_model = Column(String(64))
    issue_type = Column(String(32))     # hardware / software / other
    issue_description = Column(Text, nullable=False)
    urgency = Column(String(16), default="normal")  # urgent / normal / low
    notes = Column(Text)
    handled_notes = Column(Text)        # 管理员处理备注
    status = Column(String(32), default="pending")  # pending/in_progress/resolved/closed
    handled_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


# ──────────────────────────────────────────
# Machine Attribute Definitions & Values
# ──────────────────────────────────────────

class MachineAttributeDefinition(Base):
    """管理员自定义的机器属性字段（含内置系统字段）"""
    __tablename__ = "machine_attribute_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_key = Column(String(128), unique=True, nullable=False)
    display_name = Column(String(256), nullable=False)
    field_type = Column(String(32), nullable=False, default='text')  # 'text' | 'select'
    is_system = Column(Boolean, nullable=False, default=False)
    preset_values = Column(Text, nullable=True, default='[]')  # JSON list of strings
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class MachineAttributeValue(Base):
    """每台机器的自定义属性值"""
    __tablename__ = "machine_attribute_values"
    __table_args__ = (UniqueConstraint("machine_id", "attribute_key", name="uq_machine_attr"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    attribute_key = Column(String(128), nullable=False)
    value = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
