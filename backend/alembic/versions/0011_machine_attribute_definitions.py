"""add machine_attribute_definitions and machine_attribute_values

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'machine_attribute_definitions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('field_key', sa.String(128), nullable=False, unique=True),
        sa.Column('display_name', sa.String(256), nullable=False),
        sa.Column('field_type', sa.String(32), nullable=False, server_default='text'),
        sa.Column('is_system', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('preset_values', sa.Text, nullable=True, server_default="'[]'"),
        sa.Column('display_order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        'machine_attribute_values',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('machine_id', UUID(as_uuid=True), sa.ForeignKey('machines.id', ondelete='CASCADE'), nullable=False),
        sa.Column('attribute_key', sa.String(128), nullable=False),
        sa.Column('value', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('machine_id', 'attribute_key', name='uq_machine_attr'),
    )

    # Seed system attribute definitions
    op.execute("""
        INSERT INTO machine_attribute_definitions
            (id, field_key, display_name, field_type, is_system, preset_values, display_order)
        VALUES
            (gen_random_uuid(), 'serial_number', '序列号',   'text',   TRUE, '[]', 0),
            (gen_random_uuid(), 'model',         '型号',     'select', TRUE, '[]', 1),
            (gen_random_uuid(), 'status',        '状态',     'select', TRUE,
             '["idle","in_use","under_repair","retired"]', 2),
            (gen_random_uuid(), 'usage_type',    '用途',     'select', TRUE,
             '["motion_control","testing","software","marketing"]', 3),
            (gen_random_uuid(), 'department',    '所属部门', 'select', TRUE, '[]', 4),
            (gen_random_uuid(), 'description',   '描述',     'text',   TRUE, '[]', 5)
        ON CONFLICT (field_key) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table('machine_attribute_values')
    op.drop_table('machine_attribute_definitions')
