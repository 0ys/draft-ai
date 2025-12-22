from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router as api_router
from .core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    
    app = FastAPI(
        title="Draft AI Backend",
        version="0.1.0",
        description="Draft AI용 FastAPI 백엔드 서비스입니다.",
        docs_url="/docs",   # Swagger UI
        redoc_url="/redoc", # ReDoc 문서
    )

    # CORS 설정 (프론트엔드에서 API 호출 허용)
    # 환경변수에서 허용된 오리진 목록을 가져옴 (쉼표로 구분)
    allowed_origins = [
        origin.strip() 
        for origin in settings.cors_origins.split(",")
        if origin.strip()
    ]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )

    # API 라우터 등록
    app.include_router(api_router, prefix="/api")

    @app.get("/")
    async def root():
        return {"message": "Draft AI Backend is running"}

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    return app


app = create_app()
