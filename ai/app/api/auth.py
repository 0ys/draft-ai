from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
import google.auth.transport.requests
import google.oauth2.id_token
from datetime import datetime, timedelta
from jose import JWTError, jwt
from supabase import Client

from app.core.database import get_db
from app.core.config import get_settings

router = APIRouter()


class GoogleTokenRequest(BaseModel):
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


def verify_google_token(token: str) -> dict:
    """
    구글 ID 토큰을 검증하고 사용자 정보를 반환합니다.
    
    Args:
        token: 구글 ID 토큰
        
    Returns:
        사용자 정보 딕셔너리 (sub, email, name, picture 등)
        
    Raises:
        HTTPException: 토큰 검증 실패 시
    """
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Client ID가 설정되지 않았습니다."
        )
    
    try:
        request = google.auth.transport.requests.Request()
        id_info = google.oauth2.id_token.verify_oauth2_token(
            token, request, settings.google_client_id
        )
        
        # 구글 토큰 검증
        if id_info.get('iss') not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
            
        return id_info
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"구글 토큰 검증 실패: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"구글 토큰 검증 중 오류 발생: {str(e)}"
        )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    JWT 액세스 토큰을 생성합니다.
    
    Args:
        data: 토큰에 포함할 데이터 (예: {"sub": user_id})
        expires_delta: 만료 시간 (기본값: 7일)
        
    Returns:
        JWT 토큰 문자열
    """
    settings = get_settings()
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


async def get_or_create_user(db: Client, google_user_info: dict) -> dict:
    """
    구글 사용자 정보를 기반으로 DB에서 사용자를 조회하거나 생성합니다.
    
    Args:
        db: Supabase 클라이언트
        google_user_info: 구글에서 받은 사용자 정보
        
    Returns:
        사용자 정보 딕셔너리
    """
    google_id = google_user_info.get('sub')
    email = google_user_info.get('email')
    name = google_user_info.get('name')
    picture = google_user_info.get('picture')
    
    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="구글 사용자 정보가 올바르지 않습니다."
        )
    
    # 기존 사용자 조회
    try:
        result = db.table('users').select('*').eq('google_id', google_id).eq('deleted_at', None).execute()
        
        if result.data and len(result.data) > 0:
            # 기존 사용자 반환
            user = result.data[0]
            # 프로필 정보 업데이트 (변경 가능한 정보)
            db.table('users').update({
                'name': name,
                'picture': picture
            }).eq('id', user['id']).execute()
            return user
    except Exception as e:
        # 조회 실패 시 계속 진행 (새 사용자 생성)
        pass
    
    # 새 사용자 생성
    try:
        new_user = {
            'google_id': google_id,
            'email': email,
            'name': name,
            'picture': picture,
        }
        
        result = db.table('users').insert(new_user).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="사용자 생성에 실패했습니다."
            )
    except Exception as e:
        # 중복 이메일 또는 google_id 오류 처리
        if 'duplicate' in str(e).lower() or 'unique' in str(e).lower():
            # 다시 조회 시도
            result = db.table('users').select('*').eq('google_id', google_id).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"사용자 생성 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/google", response_model=TokenResponse)
async def google_login(
    request: GoogleTokenRequest,
    db: Client = Depends(get_db)
):
    """
    구글 ID 토큰을 받아서 검증하고, 사용자를 생성/조회한 후 JWT 토큰을 발급합니다.
    
    Args:
        request: 구글 ID 토큰이 포함된 요청
        db: Supabase 클라이언트
        
    Returns:
        JWT 액세스 토큰과 사용자 정보
    """
    # 구글 토큰 검증
    google_user_info = verify_google_token(request.token)
    
    # 사용자 조회 또는 생성
    user = await get_or_create_user(db, google_user_info)
    
    # JWT 토큰 생성
    access_token = create_access_token(data={"sub": str(user['id'])})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(user['id']),
            "email": user['email'],
            "name": user.get('name'),
            "picture": user.get('picture'),
        }
    )


def get_current_user(token: str, db: Client) -> dict:
    """
    JWT 토큰에서 사용자 정보를 추출하고 검증합니다.
    
    Args:
        token: JWT 토큰
        db: Supabase 클라이언트
        
    Returns:
        사용자 정보 딕셔너리
        
    Raises:
        HTTPException: 토큰 검증 실패 시
    """
    settings = get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # DB에서 사용자 조회
    try:
        result = db.table('users').select('*').eq('id', user_id).eq('deleted_at', None).execute()
        if not result.data or len(result.data) == 0:
            raise credentials_exception
        return result.data[0]
    except Exception:
        raise credentials_exception


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    authorization: Optional[str] = None,
    db: Client = Depends(get_db)
):
    """
    현재 로그인한 사용자 정보를 반환합니다.
    
    Args:
        authorization: Authorization 헤더 (Bearer 토큰)
        db: Supabase 클라이언트
        
    Returns:
        사용자 정보
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 필요합니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.split(" ")[1]
    user = get_current_user(token, db)
    
    return UserResponse(
        id=str(user['id']),
        email=user['email'],
        name=user.get('name'),
        picture=user.get('picture'),
    )
