from fastapi import FastAPI

from .api import router as api_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Draft AI Backend",
        version="0.1.0",
        description="Draft AI용 FastAPI 백엔드 서비스입니다.",
        docs_url="/docs",   # Swagger UI
        redoc_url="/redoc", # ReDoc 문서
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
