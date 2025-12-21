-- 마이그레이션: document_status ENUM에 'uploaded' 상태 추가
-- 실행 날짜: 2025-01-XX
-- 설명: 파일 업로드 완료 후 인덱싱 시작 전 상태를 구분하기 위해 'uploaded' 상태 추가

-- 1. ENUM 타입에 'uploaded' 값 추가
-- 주의: PostgreSQL에서 ENUM에 값을 추가하는 것은 트랜잭션 내에서 불가능할 수 있으므로
-- 별도의 트랜잭션으로 실행해야 할 수 있습니다.
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'uploaded';

-- 2. 기본값 업데이트 (새로 생성되는 문서는 'uploaded'로 시작)
ALTER TABLE documents ALTER COLUMN status SET DEFAULT 'uploaded'::document_status;

-- 3. 기존 'processing' 상태 중 인덱싱이 시작되지 않은 문서들을 'uploaded'로 변경
-- (선택사항: 기존 데이터 정리용)
-- UPDATE documents 
-- SET status = 'uploaded'::document_status
-- WHERE status = 'processing'::document_status 
--   AND created_at > NOW() - INTERVAL '1 hour'  -- 최근 1시간 내 생성된 문서만
--   AND NOT EXISTS (
--     SELECT 1 FROM document_chunks WHERE document_chunks.document_id = documents.id
--   );
