"""add departments table and department column to machines

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "departments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(64), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("machines", sa.Column("department", sa.String(64), nullable=True))
    # Seed default departments
    op.execute("""
        INSERT INTO departments (id, name, created_at) VALUES
        (gen_random_uuid(), '研发部', now()),
        (gen_random_uuid(), '测试部', now()),
        (gen_random_uuid(), '市场部', now()),
        (gen_random_uuid(), '运控部', now()),
        (gen_random_uuid(), '软件部', now())
    """)


def downgrade():
    op.drop_column("machines", "department")
    op.drop_table("departments")
