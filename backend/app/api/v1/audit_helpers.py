"""Audit log helpers: log_action() and model serialization."""
import json
from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect as sa_inspect

from app.models.models import AuditLog, utcnow


def _serialize(obj: Any) -> Any:
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    return obj


def model_to_dict(instance) -> dict:
    """Serialize a SQLAlchemy model instance to a plain dict."""
    mapper = sa_inspect(type(instance))
    return {
        c.key: _serialize(getattr(instance, c.key))
        for c in mapper.column_attrs
    }


async def log_action(
    db: AsyncSession,
    *,
    user_id: str | None,
    username: str | None,
    table_name: str,
    record_id: str,
    operation: str,        # create | update | delete
    before: dict | None,
    after: dict | None,
    description: str | None = None,
):
    entry = AuditLog(
        user_id=user_id,
        username=username,
        table_name=table_name,
        record_id=record_id,
        operation=operation,
        before_data=json.dumps(before, default=str) if before is not None else None,
        after_data=json.dumps(after, default=str) if after is not None else None,
        description=description,
        created_at=utcnow(),
    )
    db.add(entry)
    # Caller is responsible for commit
