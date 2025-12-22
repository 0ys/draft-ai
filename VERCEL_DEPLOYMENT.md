# Vercel 배포 가이드

이 문서는 Draft AI 프로젝트를 Vercel에 배포하는 방법을 설명합니다.

## 프로젝트 구조

- **프론트엔드**: Next.js (Vercel에 배포)
- **백엔드**: FastAPI (별도 배포 필요 - Railway, Render, Fly.io 등)

## 1. 프론트엔드 배포 (Vercel)

### 1.1 Vercel 계정 및 CLI 설정

1. [Vercel](https://vercel.com)에 가입/로그인
2. Vercel CLI 설치:
   ```bash
   npm install -g vercel
   ```
3. Vercel 로그인:
   ```bash
   vercel login
   ```

### 1.2 프로젝트 배포

#### 방법 1: Vercel CLI 사용

```bash
cd frontend
vercel
```

배포 과정에서:
- 프로젝트 이름 설정
- 배포 디렉토리: `frontend` (또는 루트에서 배포하는 경우 `.`)
- 빌드 명령어: `npm run build` (자동 감지됨)
- 출력 디렉토리: `.next` (자동 감지됨)

#### 방법 2: Vercel 웹 대시보드 사용

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. "Add New..." → "Project" 클릭
3. GitHub/GitLab/Bitbucket 저장소 연결 또는 직접 업로드
4. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 1.3 환경 변수 설정

Vercel 대시보드에서 프로젝트 → Settings → Environment Variables에 다음 변수를 추가:

#### 필수 환경 변수

```
NEXT_PUBLIC_APP_IP=https://your-backend-url.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

**참고:**
- `NEXT_PUBLIC_APP_IP`: 배포된 백엔드 API URL (예: `https://your-backend.railway.app` 또는 `https://api.yourdomain.com`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
- 환경 변수는 프로덕션, 프리뷰, 개발 환경별로 설정 가능

### 1.4 Google OAuth 설정 업데이트

Google Cloud Console에서:
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. API 및 서비스 → 사용자 인증 정보
3. OAuth 2.0 클라이언트 ID 편집
4. 승인된 JavaScript 원본에 Vercel 배포 URL 추가:
   - `https://your-project.vercel.app`
   - `https://*.vercel.app` (프리뷰 배포용)
5. 승인된 리디렉션 URI에 추가:
   - `https://your-project.vercel.app/login`
   - `https://*.vercel.app/login`

## 2. 백엔드 배포

Vercel은 Python 백엔드에 제한적이므로 별도 플랫폼에 배포해야 합니다.

### 추천 플랫폼

#### 옵션 1: Railway (추천)
- Python/FastAPI 지원 우수
- 간단한 설정
- 무료 티어 제공

#### 옵션 2: Render
- 무료 티어 제공
- 자동 배포 지원

#### 옵션 3: Fly.io
- 글로벌 배포
- Docker 기반

### Railway 배포 예시

1. [Railway](https://railway.app) 가입
2. 새 프로젝트 생성 → "Deploy from GitHub repo"
3. `ai` 폴더를 루트로 설정
4. 환경 변수 설정:
   ```
   CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-key
   OPENAI_API_KEY=your-openai-key
   LLAMA_CLOUD_API_KEY=your-llamaparse-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   JWT_SECRET_KEY=your-secure-jwt-secret
   POSTGRES_HOST=your-postgres-host
   POSTGRES_PORT=5432
   POSTGRES_DATABASE=your-database
   POSTGRES_USER=your-user
   POSTGRES_PASSWORD=your-password
   ```
5. Railway가 자동으로 FastAPI 앱을 감지하고 배포

### 백엔드 CORS 설정

백엔드의 `.env` 파일 또는 환경 변수에 프론트엔드 URL을 추가:

```bash
CORS_ORIGINS=https://your-project.vercel.app,http://localhost:3000,http://127.0.0.1:3000
```

## 3. 배포 확인

### 프론트엔드 확인
1. Vercel 대시보드에서 배포 URL 확인
2. 브라우저에서 접속하여 정상 작동 확인
3. Google 로그인 테스트

### 백엔드 확인
1. 백엔드 URL의 `/health` 엔드포인트 확인
2. `/docs` 엔드포인트로 Swagger UI 확인
3. 프론트엔드에서 API 호출 테스트

## 4. 커스텀 도메인 설정 (선택사항)

### Vercel 도메인 설정
1. Vercel 프로젝트 → Settings → Domains
2. 도메인 추가 및 DNS 설정
3. SSL 인증서 자동 발급

### 백엔드 도메인 설정
- Railway, Render 등에서도 커스텀 도메인 지원
- 백엔드 도메인 설정 후 프론트엔드의 `NEXT_PUBLIC_APP_IP` 업데이트

## 5. 트러블슈팅

### CORS 오류
- 백엔드의 `CORS_ORIGINS`에 프론트엔드 URL이 포함되어 있는지 확인
- 프로토콜(`https://`) 포함 여부 확인

### 환경 변수 오류
- Vercel에서 환경 변수가 제대로 설정되었는지 확인
- `NEXT_PUBLIC_` 접두사 확인 (클라이언트 사이드 변수)
- 배포 후 환경 변수 변경 시 재배포 필요

### 빌드 오류
- Node.js 버전 확인 (`package.json`의 `engines` 필드)
- 의존성 설치 오류 확인
- 빌드 로그 확인

## 6. 지속적 배포 (CI/CD)

### GitHub 연동
1. Vercel 프로젝트 → Settings → Git
2. GitHub 저장소 연결
3. 자동 배포 활성화:
   - `main` 브랜치 → 프로덕션 배포
   - 다른 브랜치 → 프리뷰 배포

### 환경별 배포
- 프로덕션: `main` 브랜치
- 스테이징: `staging` 브랜치
- 개발: 각 PR별 프리뷰 배포

## 7. 모니터링 및 로그

### Vercel 로그
- Vercel 대시보드 → 프로젝트 → Deployments → 각 배포의 로그 확인

### 백엔드 로그
- Railway/Render 대시보드에서 로그 확인
- 에러 추적 도구 연동 (Sentry 등)

## 참고 자료

- [Vercel 공식 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Railway 문서](https://docs.railway.app)
- [FastAPI 배포 가이드](https://fastapi.tiangolo.com/deployment/)
