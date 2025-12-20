from supabase import create_client, Client
from typing import Optional
from .config import get_settings


class Database:
    _client: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        """Supabase 클라이언트를 반환합니다."""
        if cls._client is None:
            settings = get_settings()
            if not settings.supabase_url or not settings.supabase_key:
                raise ValueError(
                    "Supabase 설정이 없습니다. "
                    ".env 파일에 SUPABASE_URL과 SUPABASE_KEY를 설정해주세요."
                )
            cls._client = create_client(settings.supabase_url, settings.supabase_key)
        return cls._client


def get_db() -> Client:
    """의존성 주입을 위한 DB 클라이언트 반환 함수"""
    return Database.get_client()
