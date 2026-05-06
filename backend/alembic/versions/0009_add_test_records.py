"""add test_records, damage_cause_presets, project_name to assignments

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. damage_cause_presets table
    op.create_table(
        'damage_cause_presets',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(128), unique=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 2. test_records table
    op.create_table(
        'test_records',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('machine_id', UUID(as_uuid=True), sa.ForeignKey('machines.id'), nullable=False),
        sa.Column('project_name', sa.String(256), nullable=False),
        sa.Column('test_purpose', sa.Text, nullable=False),
        sa.Column('test_method', sa.Text, nullable=True),
        sa.Column('test_result', sa.Text, nullable=True),
        sa.Column('tester', sa.String(128), nullable=True),
        sa.Column('start_date', sa.Date, nullable=False),
        sa.Column('end_date', sa.Date, nullable=True),
        sa.Column('status', sa.Enum('in_progress', 'completed', 'failed', 'paused', name='teststatus'), nullable=False, server_default='in_progress'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 3. add project_name to machine_assignments
    op.add_column(
        'machine_assignments',
        sa.Column('project_name', sa.String(256), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('machine_assignments', 'project_name')
    op.drop_table('test_records')
    op.drop_table('damage_cause_presets')
    op.execute("DROP TYPE IF EXISTS teststatus")
