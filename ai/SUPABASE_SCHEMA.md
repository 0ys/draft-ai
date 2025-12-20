# Supabase 데이터베이스 스키마 (ERD)

이 문서는 Draft-AI 프로젝트의 전체 데이터베이스 스키마를 정의합니다. PostgreSQL 기준으로 작성되었으며, Supabase에서 사용됩니다.

## 목차

1. [테이블 구조](#테이블-구조)
2. [인덱스 설정](#인덱스-설정)
3. [확장 기능](#확장-기능)
4. [환경 변수 설정](#환경-변수-설정)

---

## 테이블 구조

### ① users 테이블

구글 인증 정보를 포함한 사용자 정보를 저장합니다.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT UNIQUE NOT NULL, -- 구글 고유 식별자 (sub)
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT, -- 구글 프로필 이미지 URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- 소프트 딜리트
);
```

**설명:**
- `google_id`: 구글 OAuth의 고유 식별자 (sub 값)
- `email`: 사용자 이메일 (고유 제약)
- `deleted_at`: 소프트 딜리트를 위한 필드 (NULL이면 활성 상태)

---

### ② folders 테이블

계층형 폴더 구조를 관리합니다. Self-reference를 통해 부모-자식 관계를 표현합니다.

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  parent_id UUID REFERENCES folders(id), -- 상위 폴더 (Self-reference)
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

**설명:**
- `parent_id`: 상위 폴더 참조 (NULL이면 루트 폴더)
- `user_id`: 폴더 소유자
- 계층 구조: `parent_id`가 NULL인 경우 루트 폴더

---

### ③ documents 테이블

업로드된 문서 파일의 메타데이터를 관리합니다. `folder_path` 대신 `folder_id`를 사용하여 정규화된 구조를 유지합니다.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  folder_id UUID REFERENCES folders(id), -- folder_path 대신 ID 기반 연관 관계
  original_filename TEXT NOT NULL,
  saved_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  metadata JSONB DEFAULT '{}', -- PDF 페이지 수, 작성자 등 추가 정보 저장
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- 소프트 딜리트
);
```

**설명:**
- `folder_id`: `folders` 테이블 참조 (NULL 가능)
- `saved_filename`: 서버에 저장된 파일명 (타임스탬프 + UUID)
- `file_path`: 저장 경로 (상대 경로)
- `status`: 문서 처리 상태
  - `processing`: 처리 중
  - `completed`: 처리 완료
  - `failed`: 처리 실패
- `metadata`: JSONB 형식으로 추가 정보 저장 (페이지 수, 작성자 등)

---

### ④ document_chunks 테이블

RAG(Retrieval-Augmented Generation)를 위한 문서 조각화 데이터를 저장합니다.

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- 텍스트 본문 (Q&A 쌍 등)
  embedding VECTOR(1536), -- pgvector 사용 시 (OpenAI 임베딩 크기)
  metadata JSONB DEFAULT '{}', -- 페이지 번호, 섹션 제목 등
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**설명:**
- `content`: 청킹된 텍스트 본문
- `embedding`: 벡터 임베딩 (pgvector 확장 사용)
- `metadata`: 페이지 번호, 섹션 제목 등 추가 정보
- `ON DELETE CASCADE`: 문서 삭제 시 관련 청크도 자동 삭제

**주의:** pgvector 확장이 필요합니다:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### ⑤ drafts 테이블

AI로 생성된 초안의 기록을 저장합니다.

```sql
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT, -- 초안 제목
  query_text TEXT NOT NULL, -- 사용자의 핵심 질문
  generated_content TEXT NOT NULL, -- AI 생성 본문
  metadata JSONB DEFAULT '{}', -- 사용된 모델(GPT-4o 등), 토큰 소모량 등
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);
```

**설명:**
- `query_text`: 사용자가 입력한 질문
- `generated_content`: AI가 생성한 초안 내용
- `metadata`: 모델 정보, 토큰 사용량 등

---

### ⑥ draft_sources 테이블

초안과 근거 문서 청크를 연결하는 N:M 관계 테이블입니다.

```sql
CREATE TABLE draft_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES document_chunks(id),
  similarity_score FLOAT -- 유사도 점수 기록
);
```

**설명:**
- `draft_id`: 초안 ID
- `chunk_id`: 참조된 문서 청크 ID
- `similarity_score`: 유사도 점수 (RAG 검색 결과)
- `ON DELETE CASCADE`: 초안 삭제 시 관련 소스 연결도 자동 삭제

---

## 인덱스 설정

조회 성능을 극대화하기 위해 자주 조회되는 외래키와 검색 조건에 인덱스를 생성합니다.

### 사용자별 데이터 조회 최적화

```sql
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_drafts_user_id ON drafts(user_id);
```

### 폴더 트리 조회 최적화

```sql
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
```

### 소프트 딜리트 필터링 최적화

```sql
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_deleted_at ON folders(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_drafts_deleted_at ON drafts(deleted_at) WHERE deleted_at IS NULL;
```

### 문서 상태별 조회 최적화 (대시보드용)

```sql
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_user_status ON documents(user_id, status) WHERE deleted_at IS NULL;
```

### 근거 추적 성능 향상

```sql
CREATE INDEX idx_draft_sources_draft_id ON draft_sources(draft_id);
CREATE INDEX idx_draft_sources_chunk_id ON draft_sources(chunk_id);
```

### 벡터 검색 최적화 (pgvector)

```sql
-- 벡터 유사도 검색을 위한 인덱스 (HNSW 알고리즘 사용)
CREATE INDEX idx_document_chunks_embedding ON document_chunks 
USING hnsw (embedding vector_cosine_ops);
```

---

## 확장 기능

### pgvector 확장

벡터 임베딩 검색을 위해 pgvector 확장이 필요합니다.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### UUID 확장

UUID 생성 함수를 사용하기 위해 필요합니다 (일반적으로 기본 포함).

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 환경 변수 설정

`.env` 파일에 다음 변수를 추가하세요:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

---

## 초기 데이터 설정

### 테스트 사용자 (개발용)

```sql
-- 테스트 사용자 생성 (구글 인증 없이)
INSERT INTO users (id, google_id, email, name) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-google-id',
  'test@test.com',
  '테스트 사용자'
);
```

**참고:** 프로덕션 환경에서는 구글 OAuth를 통해 사용자가 자동으로 생성됩니다.

---

## 마이그레이션 순서

1. 확장 기능 설치
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

2. 테이블 생성 (순서 중요)
   - `users` → `folders` → `documents` → `document_chunks` → `drafts` → `draft_sources`

3. 인덱스 생성
   - 모든 테이블 생성 후 인덱스 생성

---

## 참고사항

- 모든 테이블은 소프트 딜리트(`deleted_at`)를 지원합니다.
- 외래키 제약조건으로 데이터 무결성을 보장합니다.
- `ON DELETE CASCADE`로 관련 데이터 자동 정리됩니다.
- 벡터 검색은 pgvector의 HNSW 인덱스를 사용합니다.
