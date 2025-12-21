from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router as api_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Draft AI Backend",
        version="0.1.0",
        description="Draft AI용 FastAPI 백엔드 서비스입니다.",
        docs_url="/docs",   # Swagger UI
        redoc_url="/redoc", # ReDoc 문서
    )

    # CORS 설정 (프론트엔드에서 API 호출 허용)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",  # Next.js 개발 서버
            "http://127.0.0.1:3000",
        ],
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
