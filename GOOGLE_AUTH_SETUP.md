# 구글 로그인 설정 가이드

이 문서는 Draft-AI 프로젝트에 구글 OAuth 로그인을 설정하는 방법을 설명합니다.

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성 및 OAuth 동의 화면 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.
2. 새 프로젝트를 생성하거나 기존 프로젝트를 선택합니다.
3. **API 및 서비스** > **OAuth 동의 화면**으로 이동합니다.
4. 사용자 유형을 선택합니다 (외부 또는 내부).
5. 앱 정보를 입력합니다:
   - 앱 이름: `Draft AI`
   - 사용자 지원 이메일: 본인의 이메일
   - 개발자 연락처 정보: 본인의 이메일
6. **저장 후 계속**을 클릭합니다.

### 1.2 OAuth 2.0 클라이언트 ID 생성

1. **API 및 서비스** > **사용자 인증 정보**로 이동합니다.
2. **+ 사용자 인증 정보 만들기** > **OAuth 클라이언트 ID**를 선택합니다.
3. 애플리케이션 유형을 **웹 애플리케이션**으로 선택합니다.
4. 이름을 입력합니다 (예: `Draft AI Web Client`).
5. **승인된 JavaScript 원본**에 다음을 추가합니다:
   - `http://localhost:3000` (개발 환경)
   - `http://127.0.0.1:3000` (개발 환경 - 127.0.0.1도 추가)
   - `https://yourdomain.com` (프로덕션 환경)
   
   **중요:** `http://localhost:3000`과 `http://127.0.0.1:3000`은 다른 origin으로 인식되므로 둘 다 추가해야 합니다.
   
6. **승인된 리디렉션 URI**는 구글 로그인 버튼 방식에서는 필요하지 않지만, 필요시 다음을 추가할 수 있습니다:
   - `http://localhost:3000` (개발 환경)
   - `http://127.0.0.1:3000` (개발 환경)
   - `https://yourdomain.com` (프로덕션 환경)
7. **만들기**를 클릭합니다.
8. **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 복사합니다.

## 2. 백엔드 환경 변수 설정

`ai/.env` 파일을 생성하거나 수정하여 다음 변수를 추가합니다:

```env
# Google OAuth 설정
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT 설정 (프로덕션에서는 반드시 변경하세요!)
JWT_SECRET_KEY=your-very-secure-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7일 (분 단위)

# 기존 Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

**중요:**
- `JWT_SECRET_KEY`는 프로덕션 환경에서 반드시 강력한 랜덤 문자열로 변경하세요.
- 최소 32자 이상의 복잡한 문자열을 사용하는 것을 권장합니다.

## 3. 프론트엔드 환경 변수 설정

`frontend/.env.local` 파일을 생성하거나 수정하여 다음 변수를 추가합니다:

```env
# 백엔드 API 서버 주소
NEXT_PUBLIC_APP_IP=http://127.0.0.1:8000

# Google OAuth Client ID (클라이언트에서 사용)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**참고:**
- Next.js는 `.env.local` 파일을 자동으로 인식합니다.
- 클라이언트 사이드에서 사용하려면 `NEXT_PUBLIC_` 접두사가 필요합니다.
- `.env.local` 파일은 Git에 커밋되지 않습니다.

## 4. 데이터베이스 마이그레이션

users 테이블이 이미 생성되어 있어야 합니다. ERD에 따라 다음 SQL을 실행하세요:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

## 5. 백엔드 의존성 설치

백엔드 디렉토리에서 다음 명령어를 실행합니다:

```bash
cd ai
pip install -r requirements.txt
```

새로 추가된 패키지:
- `google-auth>=2.23.0`
- `google-auth-oauthlib>=1.1.0`
- `google-auth-httplib2>=0.1.1`
- `python-jose[cryptography]>=3.3.0`
- `passlib[bcrypt]>=1.7.4`

## 6. 테스트

### 6.1 백엔드 서버 실행

```bash
cd ai
python run.py
```

서버가 `http://127.0.0.1:8000`에서 실행됩니다.

### 6.2 프론트엔드 서버 실행

```bash
cd frontend
npm run dev
```

프론트엔드가 `http://localhost:3000`에서 실행됩니다.

### 6.3 로그인 테스트

1. 브라우저에서 `http://localhost:3000/login`으로 이동합니다.
2. **구글 로그인** 버튼을 클릭합니다.
3. 구글 계정을 선택하고 권한을 승인합니다.
4. 로그인 성공 시 대시보드로 리다이렉트됩니다.

## 7. API 엔드포인트

### 7.1 구글 로그인

```http
POST /api/auth/google
Content-Type: application/json

{
  "token": "google-id-token"
}
```

**응답:**
```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

### 7.2 현재 사용자 정보 조회

```http
GET /api/auth/me
Authorization: Bearer {access_token}
```

**응답:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://..."
}
```

## 8. 문제 해결

### 8.1 "구글 토큰 검증 실패" 오류

- Google Cloud Console에서 클라이언트 ID가 올바르게 설정되었는지 확인하세요.
- 백엔드의 `GOOGLE_CLIENT_ID` 환경 변수가 올바른지 확인하세요.
- 프론트엔드의 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 환경 변수가 올바른지 확인하세요.

### 8.2 "The given origin is not allowed for the given client ID" 오류

- Google Cloud Console > **API 및 서비스** > **사용자 인증 정보**로 이동합니다.
- 해당 OAuth 클라이언트 ID를 클릭하여 편집합니다.
- **승인된 JavaScript 원본**에 다음이 모두 포함되어 있는지 확인합니다:
  - `http://localhost:3000`
  - `http://127.0.0.1:3000` (127.0.0.1도 별도로 추가 필요)
  - 프로덕션 도메인 (배포 시)
- 변경사항을 저장한 후 몇 분 기다린 후 다시 시도하세요.

### 8.3 "Provided button width is invalid" 경고

- 이 경고는 무시해도 됩니다. 버튼 width는 숫자 값(픽셀)으로 설정되어 있습니다.
- 버튼이 정상적으로 표시되면 문제없습니다.

### 8.2 "사용자 생성 중 오류" 오류

- 데이터베이스에 users 테이블이 생성되어 있는지 확인하세요.
- Supabase 연결 설정이 올바른지 확인하세요.
- 데이터베이스 마이그레이션이 완료되었는지 확인하세요.

### 8.3 CORS 오류

- 백엔드의 `main.py`에서 CORS 설정에 프론트엔드 URL이 포함되어 있는지 확인하세요.

## 9. 보안 고려사항

1. **JWT Secret Key**: 프로덕션 환경에서는 반드시 강력한 랜덤 문자열을 사용하세요.
2. **HTTPS**: 프로덕션 환경에서는 반드시 HTTPS를 사용하세요.
3. **토큰 만료 시간**: 필요에 따라 `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`를 조정하세요.
4. **환경 변수**: `.env` 파일은 절대 Git에 커밋하지 마세요.
