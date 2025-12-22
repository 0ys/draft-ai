from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import atexit

from .api import router as api_router
from .core.config import get_settings
from .services.batch_indexing_service import BatchIndexingService


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

    # 배치 인덱싱 스케줄러 시작
    _start_batch_scheduler()

    return app


def _start_batch_scheduler():
    """배치 인덱싱 스케줄러 시작"""
    scheduler = BackgroundScheduler()
    
    # 배치 인덱싱 서비스 인스턴스 생성
    batch_service = BatchIndexingService()
    
    # 3분마다 배치 작업 실행 (한 번에 최대 5개 문서 처리)
    scheduler.add_job(
        func=batch_service.run_batch,
        trigger=IntervalTrigger(seconds=180),  # 3분 = 180초
        args=[5],  # 한 번에 최대 5개 문서 처리
        id='batch_indexing',
        name='배치 인덱싱 작업',
        replace_existing=True,
    )
    
    scheduler.start()
    print("배치 인덱싱 스케줄러가 시작되었습니다. (3분마다 실행)")
    
    # 애플리케이션 종료 시 스케줄러 종료
    atexit.register(lambda: scheduler.shutdown())


app = create_app()
