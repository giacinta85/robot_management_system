"""add machine_model and multi-select resource id columns to marketing_requests

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("marketing_requests", sa.Column("machine_model", sa.String(64), nullable=True))
    op.add_column("marketing_requests", sa.Column("dance_policy_ids", sa.Text, nullable=True))
    op.add_column("marketing_requests", sa.Column("voice_package_ids", sa.Text, nullable=True))
    op.add_column("marketing_requests", sa.Column("motion_action_ids", sa.Text, nullable=True))


def downgrade():
    op.drop_column("marketing_requests", "motion_action_ids")
    op.drop_column("marketing_requests", "voice_package_ids")
    op.drop_column("marketing_requests", "dance_policy_ids")
    op.drop_column("marketing_requests", "machine_model")
