# AI Backend (FastAPI)

이 디렉토리는 FastAPI 기반 AI 백엔드 서비스입니다.

## 실행 방법

1. 디렉토리 이동

```bash
cd ai
```

2. 가상환경 활성화

```bash
# 가상환경 생성
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

3. 패키지 설치

```bash
pip install -r requirements.txt
```

4. 개발 서버 실행

```bash
python run.py
```

서버는 기본적으로 `http://127.0.0.1:8000` 에서 동작합니다.

### 유용한 엔드포인트

- `GET /health` : 헬스 체크
- `GET /api/ping` : 기본 API 연결 테스트
