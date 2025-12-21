# 인덱싱 아키텍처 설명

## 개요

이 문서는 Draft-AI 프로젝트의 RAG 인덱싱 구조와 동작 방식을 설명합니다.

## 인덱싱 구조

### PDF 단위 벡터 인덱스 관리

- **하나의 PDF = 하나의 벡터 인덱스**
  - 각 PDF는 독립적인 `VectorStoreIndex`를 가집니다
  - 인덱스는 `storage_qna/document_{document_id}` 디렉토리에 저장됩니다
  - PDF가 폴더를 변경해도 인덱스는 그대로 유지됩니다

### PDF별 임베딩 관리

- **각 PDF는 노드(청크) 단위로 인덱싱됩니다**
  - PDF가 업로드되면 LlamaParse로 파싱되어 여러 Document로 분할됩니다
  - 각 Document는 MarkdownElementNodeParser를 통해 노드(청크)로 변환됩니다
  - **각 노드는 독립적인 임베딩 벡터를 가집니다**
  - 하나의 PDF는 여러 노드로 구성될 수 있습니다

### 메타데이터 추적

각 노드는 다음 메타데이터를 포함합니다:
- `document_id`: 문서 ID (UUID)
- `pdf_path`: PDF 파일 경로
- `pdf_name`: PDF 파일명

이를 통해 쿼리 결과에서 어떤 PDF에서 왔는지 추적할 수 있습니다.

## 인덱싱 프로세스

### 1. 문서 업로드
```
사용자가 PDF 업로드
  ↓
서버에 파일 저장
  ↓
DB에 문서 정보 저장 (status: "processing")
  ↓
즉시 응답 반환 (프론트엔드에서 목록에 표시)
  ↓
백그라운드 작업 시작
```

### 2. 비동기 인덱싱
```
BackgroundTasks로 인덱싱 시작
  ↓
PDF 파싱 (LlamaParse)
  ↓
Document → Node 변환 (각 노드에 메타데이터 추가)
  ↓
PDF 인덱스 생성 (document_id 기반)
  - 기존 인덱스가 있으면: 로드하여 사용 (재인덱싱 없음)
  - 기존 인덱스가 없으면: 새 인덱스 생성
  ↓
인덱스 저장 (storage_qna/document_{document_id})
  ↓
DB 상태 업데이트 (status: "completed" 또는 "failed")
```

## 쿼리 프로세스

### 폴더별 쿼리
```
사용자 질문 입력
  ↓
DB에서 폴더의 완료된 PDF 목록 조회
  ↓
각 PDF 인덱스에서 검색
  - 각 PDF 인덱스를 로드
  - 각 PDF에서 similarity_top_k 개의 노드 검색
  ↓
모든 노드를 점수 순으로 정렬
  ↓
상위 k개 노드 선택
  ↓
임시 인덱스 생성하여 답변 생성
  ↓
답변 생성 및 참고문헌 정보 반환
```

### 쿼리 결과 구조

```json
{
  "answer": "생성된 답변",
  "retrieved_nodes": [
    {
      "score": 0.95,
      "text": "노드 텍스트",
      "document_id": "uuid-1",
      "pdf_name": "document1.pdf"
    },
    {
      "score": 0.87,
      "text": "노드 텍스트",
      "document_id": "uuid-2",
      "pdf_name": "document2.pdf"
    }
  ],
  "pdf_sources": [
    {
      "document_id": "uuid-1",
      "pdf_name": "document1.pdf",
      "chunks": [...],
      "max_score": 0.95
    },
    {
      "document_id": "uuid-2",
      "pdf_name": "document2.pdf",
      "chunks": [...],
      "max_score": 0.87
    }
  ]
}
```

## 설계 원칙

### 1. PDF 단위 인덱싱
- 각 PDF는 독립적인 인덱스를 가집니다
- PDF가 폴더를 변경해도 인덱스는 그대로 유지됩니다
- 폴더 변경 시 DB의 `folder_id`만 업데이트하면 됩니다

### 2. 재인덱싱 없음
- 한번 인덱싱된 PDF는 재인덱싱하지 않습니다
- 기존 인덱스가 있으면 로드하여 사용합니다
- 인덱스 정보를 지속적으로 추적합니다

### 3. 쿼리 시 동적 검색
- 쿼리 시 폴더의 PDF 목록을 DB에서 조회합니다
- 각 PDF 인덱스에서 검색하여 결과를 통합합니다
- 삭제된 PDF의 노드는 필터링됩니다

## 질문과 답변

### Q: PDF가 폴더를 변경하면 어떻게 되나요?

**A: 인덱스는 그대로 유지됩니다!**

- PDF의 인덱스는 `document_id` 기반이므로 폴더와 무관합니다
- 폴더 변경 시 DB의 `folder_id`만 업데이트하면 됩니다
- 쿼리 시 새로운 폴더의 PDF 목록을 조회하여 각 PDF 인덱스에서 검색합니다

### Q: 한번 인덱싱된 PDF를 재인덱싱할 수 있나요?

**A: 현재 설계에서는 재인덱싱을 지원하지 않습니다.**

- 한번 인덱싱된 PDF는 완벽하게 인덱싱된 것으로 간주합니다
- 인덱스 정보를 지속적으로 추적합니다
- 재인덱싱이 필요한 경우 수동으로 인덱스 파일을 삭제하고 다시 업로드해야 합니다

### Q: 폴더에 여러 PDF가 있을 때 쿼리는 어떻게 동작하나요?

**A: 각 PDF 인덱스에서 검색하여 결과를 통합합니다.**

1. DB에서 폴더의 완료된 PDF 목록 조회
2. 각 PDF 인덱스를 로드
3. 각 PDF에서 `similarity_top_k` 개의 노드 검색
4. 모든 노드를 점수 순으로 정렬
5. 상위 k개 노드 선택하여 답변 생성

### Q: 삭제된 PDF의 노드는 어떻게 처리되나요?

**A: 쿼리 시 필터링됩니다.**

- 쿼리 시 DB에서 현재 활성 PDF 목록을 조회합니다
- 검색된 노드 중 삭제된 PDF의 노드는 제외합니다
- 인덱스 파일은 삭제 시 함께 제거됩니다

## 예시 시나리오

### 시나리오: PDF가 폴더를 변경하는 경우

1. **초기 상태**
   - `document1.pdf` (id: uuid-1) → 폴더 A에 업로드
   - 인덱스 생성: `storage_qna/document_uuid-1`

2. **폴더 변경**
   - `document1.pdf`를 폴더 B로 이동
   - DB의 `folder_id`만 업데이트
   - 인덱스는 그대로 유지: `storage_qna/document_uuid-1`

3. **쿼리 수행**
   - 폴더 B에서 쿼리
   - DB에서 폴더 B의 PDF 목록 조회 → `uuid-1` 포함
   - `document_uuid-1` 인덱스에서 검색
   - 결과 반환

### 시나리오: 폴더에 여러 PDF가 있는 경우

1. **문서 업로드**
   - `document1.pdf` 업로드 → 인덱스 생성: `document_uuid-1`
   - `document2.pdf` 업로드 → 인덱스 생성: `document_uuid-2`
   - `document3.pdf` 업로드 → 인덱스 생성: `document_uuid-3`

2. **쿼리 수행**
   - 사용자가 질문 입력
   - 폴더의 PDF 목록 조회: `[uuid-1, uuid-2, uuid-3]`
   - 각 PDF 인덱스에서 검색
   - 결과 통합 및 답변 생성

## 기술 스택

- **LlamaIndex**: 벡터 인덱스 관리
- **LlamaParse**: PDF 파싱
- **OpenAI Embeddings**: 텍스트 임베딩 생성
- **FastAPI BackgroundTasks**: 비동기 인덱싱

## 파일 구조

```
storage_qna/
  ├── document_{uuid-1}/      # PDF 1 인덱스
  │   ├── default__vector_store.json
  │   ├── docstore.json
  │   ├── metadata.txt
  │   └── ...
  ├── document_{uuid-2}/      # PDF 2 인덱스
  │   ├── default__vector_store.json
  │   ├── docstore.json
  │   ├── metadata.txt
  │   └── ...
  └── document_{uuid-3}/      # PDF 3 인덱스
      └── ...
```

## 주의사항

1. **인덱스 동시성**: 현재는 단일 프로세스 환경을 가정합니다. 여러 프로세스에서 동시에 인덱싱하는 경우 파일 락이 필요할 수 있습니다.

2. **인덱스 영속성**: PDF가 폴더를 변경해도 인덱스는 그대로 유지되므로, 인덱스 파일 관리가 중요합니다.

3. **메타데이터 일관성**: 문서가 삭제되면 인덱스 파일도 함께 제거됩니다.

4. **재인덱싱**: 현재 설계에서는 재인덱싱을 지원하지 않습니다. 필요시 수동으로 인덱스 파일을 삭제하고 다시 업로드해야 합니다.
