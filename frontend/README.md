# Frontend (Next.js)

이 프로젝트는 Next.js, TypeScript, Tailwind CSS를 사용하는 프론트엔드 애플리케이션입니다.

## 사전 요구사항

- Node.js 18.18.0 이상
- npm 또는 yarn

## 프로젝트 설정

### 1. 의존성 설치

프로젝트 루트 디렉토리에서 다음 명령어를 실행하여 필요한 패키지를 설치합니다:

```bash
npm install
```

또는 yarn을 사용하는 경우:

```bash
yarn install
```

### 2. 환경 변수 설정 (필요한 경우)

프로젝트에서 환경 변수가 필요한 경우 `.env.local` 파일을 생성하고 필요한 변수를 설정합니다:

```bash
# .env.local 예시
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 프로젝트 실행

### 개발 모드

개발 서버를 실행하려면 다음 명령어를 사용합니다:

```bash
npm run dev
```

또는:

```bash
yarn dev
```

개발 서버가 실행되면 브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인할 수 있습니다.

### 프로덕션 빌드

프로덕션 환경을 위한 빌드를 생성하려면:

```bash
npm run build
```

또는:

```bash
yarn build
```

### 프로덕션 서버 실행

빌드 후 프로덕션 서버를 실행하려면:

```bash
npm run start
```

또는:

```bash
yarn start
```

## 기타 명령어

### 린트 검사

코드 린트 검사를 실행하려면:

```bash
npm run lint
```

또는:

```bash
yarn lint
```

## 프로젝트 구조

```
frontend/
├── src/
│   └── app/          # Next.js App Router 페이지 및 레이아웃
|   ├── apis/             # API 호출 함수 모음
|   ├── components/        # 재사용 가능한 React 컴포넌트
|   ├── hooks/            # 커스텀 React 훅
|   ├── libs/             # 외부 라이브러리 설정 및 초기화
|   ├── types/            # TypeScript 타입 정의
|   ├── utils/            # 유틸리티 함수 및 상수
|   └── styles/           # 추가 CSS 모듈 (필요시)
├── public/           # 정적 파일
├── next.config.mjs   # Next.js 설정 파일
├── tailwind.config.ts # Tailwind CSS 설정
├── tsconfig.json     # TypeScript 설정
└── package.json      # 프로젝트 의존성 및 스크립트
```

## 기술 스택

- **Next.js**: React 프레임워크
- **TypeScript**: 타입 안정성을 위한 언어
- **Tailwind CSS**: 유틸리티 기반 CSS 프레임워크
- **React 18**: UI 라이브러리

# 프로젝트 구조

## 최종 디렉토리 트리

```
frontend/src/
├── app/              # Next.js App Router (페이지, 레이아웃, 라우팅)
├── apis/             # API 호출 함수 모음
├── components/        # 재사용 가능한 React 컴포넌트
├── hooks/            # 커스텀 React 훅
├── libs/             # 외부 라이브러리 설정 및 초기화
├── types/            # TypeScript 타입 정의
├── utils/            # 유틸리티 함수 및 상수
└── styles/           # 추가 CSS 모듈 (필요시)
```

## 각 디렉토리 역할

- **app/**: Next.js App Router 기반 페이지, 레이아웃, 라우트 핸들러
- **apis/**: 백엔드 API 호출 함수들을 모아두는 디렉토리
- **components/**: 재사용 가능한 UI 컴포넌트 (Button, Input, Modal 등)
- **hooks/**: 커스텀 React 훅 (useAuth, useFetch 등)
- **libs/**: 외부 라이브러리 설정 (axios 인스턴스, 클라이언트 초기화 등)
- **types/**: TypeScript 인터페이스 및 타입 정의
- **utils/**: 헬퍼 함수 및 상수 정의 (formatters, validators 등)
- **styles/**: 추가 CSS 모듈 파일 (globals.css는 app/에 위치)
