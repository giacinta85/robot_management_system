"""add resource tables, marketing request fields, shipping, after_sales

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    # ── machine_model_infos ──────────────────────────
    op.create_table(
        "machine_model_infos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False, unique=True),
        sa.Column("description", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # ── dance_policies ───────────────────────────────
    op.create_table(
        "dance_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("machine_model", sa.String(64)),
        sa.Column("description", sa.Text),
        sa.Column("duration_seconds", sa.Integer),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # ── motion_actions ───────────────────────────────
    op.create_table(
        "motion_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("machine_model", sa.String(64)),
        sa.Column("description", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # ── voice_packages ───────────────────────────────
    op.create_table(
        "voice_packages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("machine_model", sa.String(64)),
        sa.Column("description", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # ── marketing_requests: new columns ─────────────
    op.add_column("marketing_requests", sa.Column("remote_operation_needed", sa.Boolean, server_default="false"))
    op.add_column("marketing_requests", sa.Column("dance_needed", sa.Boolean, server_default="false"))
    op.add_column("marketing_requests", sa.Column("dance_source", sa.String(32)))
    op.add_column("marketing_requests", sa.Column("dance_policy_id", postgresql.UUID(as_uuid=True),
                   sa.ForeignKey("dance_policies.id"), nullable=True))
    op.add_column("marketing_requests", sa.Column("group_control_needed", sa.Boolean, server_default="false"))
    op.add_column("marketing_requests", sa.Column("voice_needed", sa.Boolean, server_default="false"))
    op.add_column("marketing_requests", sa.Column("voice_source", sa.String(32)))
    op.add_column("marketing_requests", sa.Column("voice_package_id", postgresql.UUID(as_uuid=True),
                   sa.ForeignKey("voice_packages.id"), nullable=True))
    op.add_column("marketing_requests", sa.Column("motion_needed", sa.Boolean, server_default="false"))
    op.add_column("marketing_requests", sa.Column("motion_source", sa.String(32)))
    op.add_column("marketing_requests", sa.Column("motion_action_id", postgresql.UUID(as_uuid=True),
                   sa.ForeignKey("motion_actions.id"), nullable=True))
    op.add_column("marketing_requests", sa.Column("custom_requirements", sa.Text))

    # ── shipping_requests ────────────────────────────
    op.create_table(
        "shipping_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("requester_name", sa.String(128), nullable=False),
        sa.Column("requester_contact", sa.String(128)),
        sa.Column("destination", sa.String(256), nullable=False),
        sa.Column("is_international", sa.Boolean, server_default="false"),
        sa.Column("items_tools", sa.Text),
        sa.Column("items_accessories", sa.Text),
        sa.Column("items_components", sa.Text),
        sa.Column("has_battery", sa.Boolean, server_default="false"),
        sa.Column("battery_international_ok", sa.Boolean, server_default="false"),
        sa.Column("notes", sa.Text),
        sa.Column("attachments", sa.Text),
        sa.Column("status", sa.String(32), server_default="pending"),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # ── after_sales_requests ─────────────────────────
    op.create_table(
        "after_sales_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("requester_name", sa.String(128), nullable=False),
        sa.Column("requester_contact", sa.String(128)),
        sa.Column("machine_serial", sa.String(64)),
        sa.Column("machine_model", sa.String(64)),
        sa.Column("issue_type", sa.String(32)),
        sa.Column("issue_description", sa.Text, nullable=False),
        sa.Column("urgency", sa.String(16), server_default="normal"),
        sa.Column("notes", sa.Text),
        sa.Column("handled_notes", sa.Text),
        sa.Column("status", sa.String(32), server_default="pending"),
        sa.Column("handled_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # ── seed default machine models ──────────────────
    op.execute("""
        INSERT INTO machine_model_infos (id, name, description, created_at)
        VALUES
          (gen_random_uuid(), 'NIX2',  'NIX 2代机器人', NOW()),
          (gen_random_uuid(), 'NIX2.5','NIX 2.5代机器人', NOW()),
          (gen_random_uuid(), 'LUS2',  'LUS 2代机器人', NOW()),
          (gen_random_uuid(), 'LUS3',  'LUS 3代机器人', NOW())
        ON CONFLICT (name) DO NOTHING;
    """)


def downgrade():
    op.drop_table("after_sales_requests")
    op.drop_table("shipping_requests")
    for col in ["custom_requirements", "motion_action_id", "motion_source", "motion_needed",
                "voice_package_id", "voice_source", "voice_needed", "group_control_needed",
                "dance_policy_id", "dance_source", "dance_needed", "remote_operation_needed"]:
        op.drop_column("marketing_requests", col)
    op.drop_table("voice_packages")
    op.drop_table("motion_actions")
    op.drop_table("dance_policies")
    op.drop_table("machine_model_infos")
