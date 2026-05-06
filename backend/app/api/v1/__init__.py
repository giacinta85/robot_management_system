from fastapi import APIRouter
from app.api.v1 import auth, machines, maintenance, marketing, admin_resources, shipping, after_sales, audit_log, test_records

router = APIRouter()
router.include_router(auth.router)
router.include_router(machines.router)
router.include_router(maintenance.router)
router.include_router(test_records.router)
router.include_router(marketing.router)
router.include_router(admin_resources.router)
router.include_router(shipping.router)
router.include_router(after_sales.router)
router.include_router(audit_log.router)
