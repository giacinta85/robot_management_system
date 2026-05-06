"""add motor_firmware_versions, power_board_versions, system_image_versions, machine_resource_links

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. motor_firmware_versions
    op.create_table(
        'motor_firmware_versions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(256), nullable=False),
        sa.Column('machine_model', sa.String(64), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 2. power_board_versions
    op.create_table(
        'power_board_versions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(256), nullable=False),
        sa.Column('machine_model', sa.String(64), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 3. system_image_versions
    op.create_table(
        'system_image_versions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(256), nullable=False),
        sa.Column('machine_model', sa.String(64), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 4. resource_link_type enum
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE resourcelinktype AS ENUM ('motor_firmware', 'power_board', 'system_image');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    # 5. machine_resource_links
    op.create_table(
        'machine_resource_links',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('machine_id', UUID(as_uuid=True), sa.ForeignKey('machines.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resource_type', sa.Enum('motor_firmware', 'power_board', 'system_image', name='resourcelinktype', create_type=False), nullable=False),
        sa.Column('resource_id', UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('machine_id', 'resource_type', 'resource_id', name='uq_machine_resource_link'),
    )


def downgrade() -> None:
    op.drop_table('machine_resource_links')
    op.drop_table('system_image_versions')
    op.drop_table('power_board_versions')
    op.drop_table('motor_firmware_versions')
    sa.Enum(name='resourcelinktype').drop(op.get_bind(), checkfirst=True)
