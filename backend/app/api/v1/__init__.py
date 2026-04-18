from fastapi import APIRouter
from app.api.v1 import auth, machines, maintenance, marketing

router = APIRouter()
router.include_router(auth.router)
router.include_router(machines.router)
router.include_router(maintenance.router)
router.include_router(marketing.router)
