from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "Draft AI Backend"
    app_env: str = "development"
    app_debug: bool = True
    
    # Supabase 설정
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    
    # OpenAI 설정
    openai_api_key: Optional[str] = None
    
    # LlamaParse 설정
    llama_cloud_api_key: Optional[str] = None
    
    # PostgreSQL 연결 설정 (pgvector 사용)
    # Supabase의 경우 연결 문자열에서 추출
    postgres_host: Optional[str] = None
    postgres_port: int = 5432
    postgres_database: Optional[str] = None
    postgres_user: Optional[str] = None
    postgres_password: Optional[str] = None
    
    # Google OAuth 설정
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: Optional[str] = None  # 예: http://localhost:3000/api/auth/callback
    
    # JWT 설정
    jwt_secret_key: str = "draft-ai-secret-key-change-in-production"  # 프로덕션에서는 반드시 변경하세요!
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24 * 7  # 7일

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
