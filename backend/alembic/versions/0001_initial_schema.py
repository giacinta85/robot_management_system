"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-04-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('username', sa.String(64), nullable=False),
        sa.Column('hashed_password', sa.String(128), nullable=False),
        sa.Column('full_name', sa.String(128), nullable=True),
        sa.Column('role', sa.Enum('admin', 'rd_test', 'maintenance', 'marketing', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    op.create_table('machines',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('serial_number', sa.String(64), nullable=False),
        sa.Column('model', sa.String(128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('idle', 'in_use', 'under_repair', 'retired', name='machinestatus'), nullable=False),
        sa.Column('purchased_at', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_machines_serial_number', 'machines', ['serial_number'], unique=True)

    op.create_table('machine_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('machine_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('department', sa.Enum('rd', 'test', 'marketing', name='assignmentdepartment'), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['machine_id'], ['machines.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('maintenance_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('machine_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('damage_date', sa.Date(), nullable=False),
        sa.Column('damage_cause', sa.Text(), nullable=False),
        sa.Column('damage_description', sa.Text(), nullable=False),
        sa.Column('repair_detail', sa.Text(), nullable=True),
        sa.Column('repair_start_date', sa.Date(), nullable=True),
        sa.Column('repair_end_date', sa.Date(), nullable=True),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_resolved', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['machine_id'], ['machines.id']),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('marketing_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('requester_name', sa.String(128), nullable=False),
        sa.Column('requester_contact', sa.String(128), nullable=True),
        sa.Column('event_name', sa.String(256), nullable=False),
        sa.Column('location', sa.String(256), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('quantity_needed', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'approved', 'rejected', 'completed', name='requeststatus'), nullable=False),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('marketing_allocations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('request_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('machine_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['machine_id'], ['machines.id']),
        sa.ForeignKeyConstraint(['request_id'], ['marketing_requests.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('request_id', 'machine_id'),
    )


def downgrade() -> None:
    op.drop_table('marketing_allocations')
    op.drop_table('marketing_requests')
    op.drop_table('maintenance_records')
    op.drop_table('machine_assignments')
    op.drop_table('machines')
    op.drop_table('users')
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS machinestatus")
    op.execute("DROP TYPE IF EXISTS assignmentdepartment")
    op.execute("DROP TYPE IF EXISTS requeststatus")
