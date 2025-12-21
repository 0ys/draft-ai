-- 마이그레이션: pgvector 검색을 위한 RPC 함수 생성
-- 실행 날짜: 2025-01-XX
-- 설명: document_chunks 테이블에서 pgvector를 사용한 벡터 검색을 위한 RPC 함수

-- 1. 벡터 검색 RPC 함수
-- document_ids 리스트와 query_embedding을 받아서 유사도가 높은 청크를 반환
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding vector(1536),
  document_ids uuid[],
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.document_id = ANY(document_ids)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. 청크 저장을 위한 RPC 함수 (VECTOR 타입 직접 저장)
-- Supabase REST API는 VECTOR 타입을 직접 지원하지 않으므로 RPC 함수 사용
CREATE OR REPLACE FUNCTION insert_document_chunk(
  p_document_id uuid,
  p_content text,
  p_embedding vector(1536),
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  chunk_id uuid;
BEGIN
  INSERT INTO document_chunks (
    id,
    document_id,
    content,
    embedding,
    metadata
  )
  VALUES (
    gen_random_uuid(),
    p_document_id,
    p_content,
    p_embedding,
    p_metadata
  )
  RETURNING id INTO chunk_id;
  
  RETURN chunk_id;
END;
$$;

-- 3. 권한 설정 (필요시)
-- GRANT EXECUTE ON FUNCTION search_document_chunks TO authenticated;
-- GRANT EXECUTE ON FUNCTION insert_document_chunk TO authenticated;
