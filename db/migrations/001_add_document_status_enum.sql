-- 마이그레이션: documents.status를 TEXT에서 ENUM으로 변경
-- 실행 날짜: 2025-01-XX
-- 설명: 문서 상태 관리를 위해 ENUM 타입으로 변경하여 데이터 무결성 향상

-- 1. ENUM 타입 생성
CREATE TYPE document_status AS ENUM ('processing', 'completed', 'failed');

-- 2. 기존 데이터 검증 (잘못된 값이 있는지 확인)
-- 주의: 이 쿼리 결과가 비어있어야 합니다. 값이 있으면 먼저 정리해야 합니다.
SELECT DISTINCT status FROM documents 
WHERE status NOT IN ('processing', 'completed', 'failed');

-- 3. 임시 컬럼 추가
ALTER TABLE documents ADD COLUMN status_new document_status;

-- 4. 기존 데이터 변환
UPDATE documents 
SET status_new = CASE 
  WHEN status = 'processing' THEN 'processing'::document_status
  WHEN status = 'completed' THEN 'completed'::document_status
  WHEN status = 'failed' THEN 'failed'::document_status
  ELSE 'processing'::document_status  -- 기본값 (예상치 못한 값이 있는 경우)
END;

-- 5. 기존 컬럼 삭제 및 새 컬럼 이름 변경
ALTER TABLE documents DROP COLUMN status;
ALTER TABLE documents RENAME COLUMN status_new TO status;

-- 6. NOT NULL 제약조건 추가
ALTER TABLE documents ALTER COLUMN status SET NOT NULL;

-- 7. 기본값 설정
ALTER TABLE documents ALTER COLUMN status SET DEFAULT 'processing'::document_status;

-- 8. 인덱스 재생성 (ENUM 타입에 맞게)
DROP INDEX IF EXISTS idx_documents_status;
DROP INDEX IF EXISTS idx_documents_user_status;

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_user_status ON documents(user_id, status) WHERE deleted_at IS NULL;
