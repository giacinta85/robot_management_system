"""add usage_type, firmware_version, image_version; drop purchased_at

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-20

"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type
    machine_usage_type = sa.Enum(
        'motion_control', 'testing', 'software', 'marketing',
        name='machineusagetype'
    )
    machine_usage_type.create(op.get_bind(), checkfirst=True)

    op.add_column('machines', sa.Column('usage_type', sa.Enum('motion_control', 'testing', 'software', 'marketing', name='machineusagetype'), nullable=True))
    op.add_column('machines', sa.Column('firmware_version', sa.String(128), nullable=True))
    op.add_column('machines', sa.Column('image_version', sa.String(128), nullable=True))
    op.drop_column('machines', 'purchased_at')


def downgrade() -> None:
    op.add_column('machines', sa.Column('purchased_at', sa.Date(), nullable=True))
    op.drop_column('machines', 'image_version')
    op.drop_column('machines', 'firmware_version')
    op.drop_column('machines', 'usage_type')
    op.execute("DROP TYPE IF EXISTS machineusagetype")
