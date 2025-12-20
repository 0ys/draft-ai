from fastapi import APIRouter

from .health import router as health_router
from .documents import router as documents_router

# 메인 라우터 생성
router = APIRouter()

# 각 기능별 라우터 등록
router.include_router(health_router, tags=["health"])
router.include_router(documents_router, prefix="/documents", tags=["documents"])
