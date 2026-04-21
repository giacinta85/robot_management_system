import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.api.v1 import router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.core.security import get_password_hash
from app.models.models import Base, User, UserRole

logger = logging.getLogger(__name__)

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def create_first_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == settings.FIRST_ADMIN_USERNAME))
        if not result.scalar_one_or_none():
            admin = User(
                username=settings.FIRST_ADMIN_USERNAME,
                hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
                full_name="系统管理员",
                role=UserRole.admin,
            )
            db.add(admin)
            await db.commit()
            logger.info("First admin account created: %s", settings.FIRST_ADMIN_USERNAME)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_first_admin()
    yield


app = FastAPI(
    title="Robot Management System",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production via nginx
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

app.mount("/api/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}
