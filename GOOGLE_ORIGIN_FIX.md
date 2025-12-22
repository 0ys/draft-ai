# 구글 로그인 Origin 에러 해결 가이드

## 에러 메시지
```
The given origin is not allowed for the given client ID.
Failed to load resource: the server responded with a status of 403
```

## 원인
Google Cloud Console의 OAuth 클라이언트 ID 설정에서 **승인된 JavaScript 원본**에 현재 접속한 URL이 등록되지 않았습니다.

## 해결 방법

### 1단계: 현재 접속 URL 확인

**방법 1: 브라우저 콘솔 확인 (권장)**
1. 브라우저 개발자 도구(F12) 열기
2. Console 탭으로 이동
3. 로그인 페이지를 새로고침하면 다음과 같은 디버깅 정보가 출력됩니다:
   ```
   🔍 Google 로그인 디버깅 정보:
     - Current Origin: http://localhost:3000
     - Client ID: 155330370992-...
     - Full URL: http://localhost:3000/login
     - ⚠️ Google Console에 다음 origin이 등록되어 있는지 확인하세요:
       http://localhost:3000
   ```
4. **Current Origin** 값을 복사하세요

**방법 2: 브라우저 주소창 확인**
브라우저 주소창에서 현재 URL을 확인하세요:
- `http://localhost:3000` 인가요?
- `http://127.0.0.1:3000` 인가요?
- 다른 포트 번호를 사용하나요?

**⚠️ 중요: 맥북과 윈도우에서 origin이 다를 수 있습니다**
- 맥북: `http://localhost:3000` 또는 `http://127.0.0.1:3000`
- 윈도우: 다른 origin일 수 있음 (예: `http://192.168.x.x:3000` 또는 다른 포트)
- **각 환경에서 콘솔에 출력된 origin을 모두 Google Console에 추가해야 합니다**

### 2단계: Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. **API 및 서비스** > **사용자 인증 정보** 메뉴로 이동
4. OAuth 2.0 클라이언트 ID 목록에서 해당 클라이언트 ID를 **클릭**하여 편집

### 3단계: 승인된 JavaScript 원본 추가

**승인된 JavaScript 원본** 섹션에 다음을 **모두** 추가하세요:

**기본 개발 환경 (필수):**
```
http://localhost:3000
http://127.0.0.1:3000
```

**추가로 필요한 origin (콘솔에서 확인한 값):**
- 1단계에서 콘솔에 출력된 **Current Origin** 값을 추가하세요
- 예: `http://192.168.1.100:3000` (윈도우에서 IP 주소로 접속한 경우)
- 예: `http://localhost:3001` (다른 포트를 사용하는 경우)

**중요 사항:**
- `localhost`와 `127.0.0.1`은 **다른 origin**으로 인식됩니다
- **맥북과 윈도우에서 다른 origin을 사용할 수 있습니다**
- 각 환경에서 콘솔에 출력된 origin을 **모두** 추가해야 합니다
- 프로토콜(`http://` 또는 `https://`)과 포트 번호(`:3000`)를 정확히 입력하세요
- 마지막에 슬래시(`/`)를 붙이지 마세요
- 경로(`/login`, `/dashboard` 등)는 포함하지 마세요

### 4단계: 저장 및 대기

1. **저장** 버튼 클릭
2. **5-10분 정도 대기** (Google 서버에 설정이 반영되는 시간)
3. 브라우저 캐시 클리어 또는 시크릿 모드로 테스트

### 5단계: 확인

브라우저 개발자 도구(F12) > Console 탭에서 에러가 사라졌는지 확인하세요.

## 추가 확인 사항

### 포트 번호가 다른 경우
만약 다른 포트 번호를 사용한다면 (예: `3001`, `8080`), 해당 포트도 추가하세요:
```
http://localhost:3001
http://127.0.0.1:3001
```

### 프로덕션 환경
배포 후에는 프로덕션 도메인도 추가해야 합니다:
```
https://yourdomain.com
https://www.yourdomain.com
```

## 스크린샷 가이드

Google Cloud Console에서 설정하는 위치:
1. **API 및 서비스** > **사용자 인증 정보**
2. OAuth 2.0 클라이언트 ID 클릭
3. **승인된 JavaScript 원본** 섹션
4. **+ URI 추가** 버튼 클릭하여 URL 추가

## 맥북에서는 되는데 윈도우에서는 안 되는 경우

이 경우는 **origin이 다르기 때문**입니다. 다음을 확인하세요:

1. **윈도우에서 브라우저 콘솔 확인**
   - F12 > Console 탭
   - 로그인 페이지 새로고침
   - 출력된 **Current Origin** 값을 확인

2. **Google Console에 윈도우 origin 추가**
   - 콘솔에 출력된 origin을 Google Console에 추가
   - 예: `http://192.168.1.100:3000` 또는 `http://10.0.0.5:3000`

3. **네트워크 설정 확인**
   - 윈도우에서 `localhost` 대신 IP 주소로 접속하는 경우
   - 해당 IP 주소의 origin도 추가해야 합니다

## 여전히 안 되나요?

1. **브라우저 캐시 완전 삭제**
   - Chrome: 설정 > 개인정보 및 보안 > 인터넷 사용 기록 삭제
   - 시크릿 모드로 테스트

2. **Google Cloud Console에서 클라이언트 ID 확인**
   - 클라이언트 ID가 프론트엔드 `.env.local`의 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`와 일치하는지 확인
   - 콘솔에 출력된 Client ID와 Google Console의 Client ID가 일치하는지 확인

3. **환경 변수 확인**
   ```bash
   # frontend/.env.local 파일 확인
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here
   ```

4. **서버 재시작**
   ```bash
   # 프론트엔드 서버 재시작
   cd frontend
   npm run dev
   ```

5. **Cross-Origin-Opener-Policy 확인**
   - `next.config.mjs`에서 COOP 설정이 `unsafe-none`으로 되어 있는지 확인
   - 변경 후 서버 재시작 필요
