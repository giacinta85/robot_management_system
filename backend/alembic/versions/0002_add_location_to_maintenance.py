"""add location to maintenance_records

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-18

"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'maintenance_records',
        sa.Column('location', sa.String(256), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('maintenance_records', 'location')
