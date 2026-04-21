"""add system_features table for feature flags

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "system_features",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default="true"),
    )
    op.execute("""
        INSERT INTO system_features (key, enabled) VALUES
        ('remote_operation', true),
        ('dance', true),
        ('voice', true),
        ('motion', true),
        ('group_control', true)
    """)


def downgrade():
    op.drop_table("system_features")
