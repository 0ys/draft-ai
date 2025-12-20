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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
