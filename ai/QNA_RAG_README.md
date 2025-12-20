# Q&A RAG 시스템 사용 가이드

LlamaIndex와 LlamaParse를 사용하여 Q&A 형식의 PDF 문서를 분석하는 고성능 RAG 시스템입니다.

## 📋 목차

1. [설치](#설치)
2. [환경 변수 설정](#환경-변수-설정)
3. [사용 방법](#사용-방법)
4. [코드 구조](#코드-구조)
5. [주요 기능](#주요-기능)

## 🔧 설치

### 1. 필요한 라이브러리 설치

```bash
pip install -r requirements.txt
```

주요 설치 라이브러리:
- `llama-index>=0.10.0`: LlamaIndex 핵심 라이브러리
- `llama-index-llms-openai>=0.1.0`: OpenAI LLM 통합
- `llama-index-embeddings-openai>=0.1.0`: OpenAI 임베딩 통합
- `llama-parse>=0.4.0`: LlamaParse PDF 파서
- `llama-index-readers-file>=0.1.0`: 파일 리더
- `openai>=1.0.0`: OpenAI Python SDK

## 🔑 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성하고 다음 환경 변수를 설정하세요:

```env
# OpenAI API 키
OPENAI_API_KEY=your_openai_api_key_here

# LlamaCloud API 키 (LlamaParse 사용)
LLAMA_CLOUD_API_KEY=your_llama_cloud_api_key_here
```

### API 키 발급 방법

1. **OpenAI API 키**: https://platform.openai.com/api-keys
2. **LlamaCloud API 키**: https://cloud.llamaindex.ai 에서 회원가입 후 발급

## 🚀 사용 방법

### 기본 사용 예제

```python
from app.services.qna_rag_service import QnARAGService
from app.core.config import get_settings

# 설정 로드
settings = get_settings()

# 서비스 초기화
rag_service = QnARAGService(
    openai_api_key=settings.openai_api_key,
    llama_cloud_api_key=settings.llama_cloud_api_key,
    storage_dir="./storage_qna",
)

# PDF 파일로 인덱스 구축
rag_service.build_index("./data/qna_document.pdf")

# 질문에 답변
answer = rag_service.query("질문 내용은 무엇인가요?")
print(answer)
```

### 예제 스크립트 실행

```bash
python examples/qna_rag_example.py
```

## 📁 코드 구조

```
ai/
├── app/
│   ├── services/
│   │   └── qna_rag_service.py    # Q&A RAG 서비스 메인 모듈
│   └── core/
│       └── config.py              # 환경 변수 설정
├── examples/
│   └── qna_rag_example.py         # 사용 예제 스크립트
└── storage_qna/                   # 인덱스 저장 디렉토리 (자동 생성)
    ├── index_{pdf_id1}/          # PDF별 인덱스 디렉토리
    │   ├── metadata.txt          # PDF 경로 정보
    │   └── ...                    # 인덱스 파일들
    ├── index_{pdf_id2}/
    └── ...
```

## ✨ 주요 기능

### 1. 효율적인 PDF 파싱

- **LlamaParse** 사용: 고품질 마크다운 변환
- **병렬 처리**: `num_workers=4`로 300페이지 대용량 문서 효율적 처리
- **마크다운 형식**: `result_type="markdown"`으로 구조 보존

### 2. 질문-답변 관계 유지

- **MarkdownElementNodeParser** 사용
- 헤더(질문)와 본문(답변)이 함께 유지
- 질문과 답변이 서로 다른 청크로 분리되지 않음

### 3. 인덱스 저장 및 재사용

- **StorageContext**를 사용한 로컬 저장
- `./storage_qna` 디렉토리에 PDF별로 인덱스 저장 (`index_{pdf_id}/`)
- 재실행 시 `load_all_indices()`로 모든 인덱스 자동 로드
- 각 PDF는 고유 ID(해시값)로 관리되어 중복 방지

### 4. 고성능 검색 및 답변

- **OpenAI text-embedding-3-small**: 빠르고 정확한 임베딩
- **GPT-4o-mini**: 효율적인 답변 생성
- **상위 3개 Q&A 쌍 참조**: 관련성 높은 답변 생성
- **다중 PDF 지원**: 여러 PDF를 등록하고 통합 검색 가능

## 📝 API 사용법

### QnARAGService 클래스

#### 초기화

```python
rag_service = QnARAGService(
    openai_api_key="your_openai_key",
    llama_cloud_api_key="your_llama_key",
    storage_dir="./storage_qna",  # 선택사항
)
```

#### 여러 PDF 관리

```python
# 저장된 모든 인덱스 로드
loaded_count = rag_service.load_all_indices()
print(f"{loaded_count}개의 PDF 인덱스를 로드했습니다.")

# PDF 추가/업데이트
pdf_id = rag_service.build_index("./data/qna1.pdf")
pdf_id = rag_service.build_index("./data/qna2.pdf", force_rebuild=True)  # 강제 재구축

# PDF 목록 확인
pdfs = rag_service.list_pdfs()
for pdf in pdfs:
    print(f"이름: {pdf['name']}, ID: {pdf['id']}")

# 특정 PDF 삭제
rag_service.remove_index(pdf_id)
```

#### 질문하기 (모든 PDF에서 검색)

```python
# 기본 사용 (모든 PDF에서 상위 3개 참조)
answer = rag_service.query("질문 내용")

# 참조 문서 수 조정
answer = rag_service.query("질문 내용", similarity_top_k=5)
# 주의: similarity_top_k는 각 PDF에서 검색할 수가 아니라, 
# 모든 PDF를 통합한 결과에서 상위 k개를 선택합니다.
```

#### 참조 문서 확인

```python
# 검색된 노드(청크) 확인 (모든 PDF에서)
nodes = rag_service.get_retrieved_nodes("질문 내용", similarity_top_k=3)
for node in nodes:
    pdf_name = node.metadata.get('pdf_name', 'Unknown')
    print(f"PDF: {pdf_name}")
    print(f"Score: {node.score}")
    print(f"Content: {node.text}")
```

## 🔍 작동 원리

1. **PDF 파싱**: LlamaParse가 PDF를 마크다운으로 변환
2. **노드 생성**: MarkdownElementNodeParser가 질문-답변 구조를 유지하며 청크 생성
3. **임베딩**: 각 청크를 OpenAI 임베딩으로 벡터화
4. **인덱스 저장**: 각 PDF별로 벡터 인덱스를 로컬에 저장 (`storage_qna/index_{pdf_id}/`)
5. **통합 검색**: 사용자 질문에 대해 모든 PDF 인덱스에서 검색하고 결과를 통합
6. **답변 생성**: 검색된 상위 k개 청크를 컨텍스트로 GPT-4o-mini가 답변 생성

### 여러 PDF 관리 방식

- 각 PDF는 파일 경로의 MD5 해시값으로 고유 ID 생성
- 각 PDF별로 독립적인 인덱스 저장 및 관리
- 쿼리 시 모든 인덱스에서 검색하여 결과 통합
- PDF 추가/삭제 시 해당 인덱스만 업데이트

## ⚠️ 주의사항

1. **LlamaCloud API 키**: LlamaParse는 유료 서비스일 수 있습니다. 무료 티어 확인 필요
2. **저장 공간**: 300페이지 PDF의 인덱스는 수백 MB 이상일 수 있습니다
3. **처리 시간**: 첫 파싱은 시간이 오래 걸릴 수 있습니다 (병렬 처리로 최적화됨)
4. **API 비용**: OpenAI API 사용량에 따라 비용이 발생합니다

## 🐛 문제 해결

### 인덱스 로드 실패
- 특정 PDF 인덱스가 손상된 경우: `storage_qna/index_{pdf_id}` 디렉토리를 삭제하고 재구축
- 모든 인덱스 재구축: `storage_qna` 디렉토리를 삭제하고 모든 PDF를 다시 추가

### 파싱 오류
- PDF 파일이 손상되지 않았는지 확인
- LlamaCloud API 키가 유효한지 확인

### 메모리 부족
- `num_workers`를 줄여보세요 (기본값: 4)

## 📚 참고 자료

- [LlamaIndex 공식 문서](https://docs.llamaindex.ai/)
- [LlamaParse 문서](https://docs.llamaindex.ai/en/stable/module_guides/loading/connector/llama_parse.html)
- [OpenAI API 문서](https://platform.openai.com/docs)
