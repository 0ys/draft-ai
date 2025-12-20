"""
Q&A PDF 문서를 위한 고성능 RAG 시스템

LlamaParse와 LlamaIndex를 사용하여 질문-답변 형식의 PDF 문서를 분석하고
효율적인 검색 및 답변 생성 시스템을 구축합니다.
"""

import os
import hashlib
from pathlib import Path
from typing import Optional, List, Dict
from llama_index.core import (
    VectorStoreIndex,
    StorageContext,
    load_index_from_storage,
    Settings,
    Document,
)
from llama_index.core.node_parser import MarkdownElementNodeParser
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_parse import LlamaParse


class QnARAGService:
    """Q&A PDF 문서를 위한 RAG 서비스 클래스"""

    def __init__(
        self,
        openai_api_key: str,
        llama_cloud_api_key: str,
        storage_dir: str = "./storage_qna",
    ):
        """
        QnARAGService 초기화

        Args:
            openai_api_key: OpenAI API 키
            llama_cloud_api_key: LlamaCloud API 키 (LlamaParse 사용)
            storage_dir: 인덱스 저장 디렉토리 경로
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)

        # OpenAI LLM 및 임베딩 설정
        Settings.llm = OpenAI(
            model="gpt-4o-mini",
            api_key=openai_api_key,
            temperature=0.1,
        )
        Settings.embed_model = OpenAIEmbedding(
            model_name="text-embedding-3-small",
            api_key=openai_api_key,
        )

        # LlamaParse 초기화
        self.parser = LlamaParse(
            api_key=llama_cloud_api_key,
            result_type="markdown",  # 마크다운 형식으로 파싱
            num_workers=4,  # 병렬 처리 워커 수
            verbose=True,
        )

        # 여러 PDF 인덱스 관리 (pdf_id -> VectorStoreIndex)
        self.indices: Dict[str, VectorStoreIndex] = {}
        
        # PDF 메타데이터 관리 (pdf_id -> {path, name})
        self.pdf_metadata: Dict[str, Dict[str, str]] = {}
        
        # 통합 쿼리 엔진 (모든 인덱스에서 검색)
        self.query_engine = None

    def _get_pdf_id(self, pdf_path: str) -> str:
        """
        PDF 파일 경로로부터 고유 ID 생성
        
        Args:
            pdf_path: PDF 파일 경로
            
        Returns:
            PDF 고유 ID (해시값)
        """
        # 절대 경로를 사용하여 일관된 ID 생성
        abs_path = os.path.abspath(pdf_path)
        return hashlib.md5(abs_path.encode()).hexdigest()
    
    def _parse_pdf(self, pdf_path: str) -> List[Document]:
        """
        PDF 파일을 파싱하여 Document 리스트로 변환

        Args:
            pdf_path: PDF 파일 경로

        Returns:
            파싱된 Document 리스트
        """
        print(f"PDF 파싱 시작: {pdf_path}")

        # LlamaParse를 사용하여 PDF 파싱
        documents = self.parser.load_data(pdf_path)

        print(f"파싱 완료: {len(documents)}개의 문서 생성")
        return documents

    def _create_index_from_documents(self, documents: List[Document]) -> VectorStoreIndex:
        """
        Document 리스트로부터 인덱스 생성
        마크다운 구조를 유지하기 위해 MarkdownElementNodeParser 사용

        Args:
            documents: 파싱된 Document 리스트

        Returns:
            생성된 VectorStoreIndex
        """
        print("인덱스 생성 중...")

        # MarkdownElementNodeParser를 사용하여 질문-답변 관계 유지
        # 헤더(질문)와 본문(답변)이 함께 유지되도록 설정
        # 이 파서는 마크다운의 구조적 요소(헤더, 본문)를 인식하여
        # 질문과 답변이 서로 다른 청크로 분리되지 않도록 함
        node_parser = MarkdownElementNodeParser()

        # 인덱스 생성 (노드 파서 적용)
        index = VectorStoreIndex.from_documents(
            documents,
            node_parser=node_parser,
            show_progress=True,
        )

        print("인덱스 생성 완료")
        return index

    def build_index(self, pdf_path: str, force_rebuild: bool = False) -> str:
        """
        PDF 파일로부터 인덱스를 구축하고 저장

        Args:
            pdf_path: PDF 파일 경로
            force_rebuild: 기존 인덱스가 있어도 강제로 재구축할지 여부

        Returns:
            PDF 고유 ID
        """
        pdf_id = self._get_pdf_id(pdf_path)
        storage_path = self.storage_dir / f"index_{pdf_id}"

        # 기존 인덱스가 있고 force_rebuild가 False면 로드
        if storage_path.exists() and not force_rebuild:
            print(f"기존 인덱스 발견: {storage_path}")
            try:
                storage_context = StorageContext.from_defaults(
                    persist_dir=str(storage_path)
                )
                index = load_index_from_storage(storage_context)
                self.indices[pdf_id] = index
                
                # 메타데이터 저장
                self.pdf_metadata[pdf_id] = {
                    "path": pdf_path,
                    "name": os.path.basename(pdf_path),
                }
                
                print(f"기존 인덱스 로드 완료: {os.path.basename(pdf_path)}")
                # 쿼리 엔진 초기화 (인덱스가 변경되었으므로)
                self.query_engine = None
                return pdf_id
            except Exception as e:
                print(f"인덱스 로드 실패: {e}. 재구축을 진행합니다.")

        # PDF 파싱
        documents = self._parse_pdf(pdf_path)

        # 인덱스 생성
        index = self._create_index_from_documents(documents)

        # 인덱스 저장
        print(f"인덱스 저장 중: {storage_path}")
        index.storage_context.persist(persist_dir=str(storage_path))
        
        # 메타데이터 파일 저장 (PDF 경로)
        metadata_file = storage_path / "metadata.txt"
        with open(metadata_file, "w", encoding="utf-8") as f:
            f.write(pdf_path)
        
        print("인덱스 저장 완료")

        # 인덱스 등록
        self.indices[pdf_id] = index
        
        # 메타데이터 저장
        self.pdf_metadata[pdf_id] = {
            "path": pdf_path,
            "name": os.path.basename(pdf_path),
        }
        
        # 쿼리 엔진 초기화 (인덱스가 변경되었으므로)
        self.query_engine = None
        
        return pdf_id

    def load_all_indices(self) -> int:
        """
        저장된 모든 인덱스를 로드

        Returns:
            로드된 인덱스 개수
        """
        loaded_count = 0
        
        # storage_dir에서 모든 index_* 디렉토리 찾기
        for index_dir in self.storage_dir.glob("index_*"):
            if not index_dir.is_dir():
                continue
                
            pdf_id = index_dir.name.replace("index_", "")
            
            try:
                storage_context = StorageContext.from_defaults(
                    persist_dir=str(index_dir)
                )
                index = load_index_from_storage(storage_context)
                self.indices[pdf_id] = index
                
                # 메타데이터 파일에서 정보 로드 시도
                metadata_file = index_dir / "metadata.txt"
                if metadata_file.exists():
                    with open(metadata_file, "r", encoding="utf-8") as f:
                        pdf_path = f.read().strip()
                        self.pdf_metadata[pdf_id] = {
                            "path": pdf_path,
                            "name": os.path.basename(pdf_path),
                        }
                else:
                    # 메타데이터가 없으면 기본값 사용
                    self.pdf_metadata[pdf_id] = {
                        "path": "unknown",
                        "name": f"PDF_{pdf_id[:8]}",
                    }
                
                loaded_count += 1
                print(f"인덱스 로드 완료: {self.pdf_metadata[pdf_id]['name']}")
            except Exception as e:
                print(f"인덱스 로드 실패 ({index_dir.name}): {e}")
        
        if loaded_count > 0:
            # 쿼리 엔진 초기화
            self.query_engine = None
            print(f"총 {loaded_count}개의 인덱스를 로드했습니다.")
        else:
            print("저장된 인덱스가 없습니다.")
        
        return loaded_count
    
    def list_pdfs(self) -> List[Dict[str, str]]:
        """
        등록된 PDF 목록 반환

        Returns:
            PDF 메타데이터 리스트
        """
        return [
            {"id": pdf_id, **metadata}
            for pdf_id, metadata in self.pdf_metadata.items()
        ]
    
    def remove_index(self, pdf_id: str) -> bool:
        """
        특정 PDF 인덱스 제거

        Args:
            pdf_id: PDF 고유 ID

        Returns:
            제거 성공 여부
        """
        if pdf_id not in self.indices:
            print(f"인덱스를 찾을 수 없습니다: {pdf_id}")
            return False
        
        # 인덱스 제거
        del self.indices[pdf_id]
        del self.pdf_metadata[pdf_id]
        
        # 저장된 인덱스 디렉토리 제거
        storage_path = self.storage_dir / f"index_{pdf_id}"
        if storage_path.exists():
            import shutil
            shutil.rmtree(storage_path)
            print(f"인덱스 디렉토리 제거 완료: {storage_path}")
        
        # 쿼리 엔진 초기화
        self.query_engine = None
        
        return True

    def _create_unified_query_engine(self, similarity_top_k: int = 3):
        """
        모든 인덱스를 통합한 쿼리 엔진 생성
        
        Args:
            similarity_top_k: 각 인덱스에서 검색할 문서 수
            
        Returns:
            통합 QueryEngine 인스턴스
        """
        if not self.indices:
            raise ValueError("인덱스가 없습니다. 먼저 build_index() 또는 load_all_indices()를 호출하세요.")
        
        # 여러 인덱스의 retriever를 결합
        from llama_index.core.retrievers import RouterRetriever
        from llama_index.core.selectors import LLMSingleSelector
        from llama_index.core.query_engine import RetrieverQueryEngine
        
        retrievers = []
        for pdf_id, index in self.indices.items():
            retriever = index.as_retriever(similarity_top_k=similarity_top_k)
            retrievers.append(retriever)
        
        # 여러 retriever를 결합하여 사용
        # 각 retriever에서 검색한 후 결과를 합침
        from llama_index.core.retrievers import VectorIndexRetriever
        
        # 간단한 방법: 모든 인덱스에서 검색하고 결과를 합치기
        class UnifiedRetriever:
            def __init__(self, retrievers, similarity_top_k):
                self.retrievers = retrievers
                self.similarity_top_k = similarity_top_k
            
            def retrieve(self, query_str):
                all_nodes = []
                for retriever in self.retrievers:
                    nodes = retriever.retrieve(query_str)
                    all_nodes.extend(nodes)
                
                # Score 기준으로 정렬하고 상위 k개 선택
                all_nodes.sort(key=lambda x: x.score or 0, reverse=True)
                return all_nodes[:self.similarity_top_k]
        
        unified_retriever = UnifiedRetriever(retrievers, similarity_top_k)
        
        # QueryEngine 생성
        query_engine = RetrieverQueryEngine.from_args(
            retriever=unified_retriever,
            response_mode="compact",
        )
        
        return query_engine
    
    def get_query_engine(self, similarity_top_k: int = 3):
        """
        통합 쿼리 엔진 생성 또는 반환

        Args:
            similarity_top_k: 검색할 관련 문서 수 (기본값: 3)

        Returns:
            QueryEngine 인스턴스
        """
        if not self.indices:
            raise ValueError("인덱스가 없습니다. 먼저 build_index() 또는 load_all_indices()를 호출하세요.")

        if self.query_engine is None:
            # 모든 인덱스에서 검색하는 통합 쿼리 엔진 생성
            self.query_engine = self._create_unified_query_engine(similarity_top_k)

        return self.query_engine

    def query(self, question: str, similarity_top_k: int = 3) -> str:
        """
        사용자 질문에 대한 답변 생성

        Args:
            question: 사용자 질문
            similarity_top_k: 검색할 관련 문서 수 (기본값: 3)

        Returns:
            생성된 답변
        """
        query_engine = self.get_query_engine(similarity_top_k=similarity_top_k)

        print(f"질문: {question}")
        response = query_engine.query(question)
        print(f"답변 생성 완료")

        return str(response)

    def get_retrieved_nodes(self, question: str, similarity_top_k: int = 3) -> List:
        """
        질문에 대한 관련 노드(청크) 검색 (모든 인덱스에서)

        Args:
            question: 사용자 질문
            similarity_top_k: 검색할 관련 문서 수

        Returns:
            검색된 노드 리스트
        """
        if not self.indices:
            raise ValueError("인덱스가 없습니다. 먼저 build_index() 또는 load_all_indices()를 호출하세요.")

        # 모든 인덱스에서 검색
        all_nodes = []
        for pdf_id, index in self.indices.items():
            retriever = index.as_retriever(similarity_top_k=similarity_top_k)
            nodes = retriever.retrieve(question)
            # 각 노드에 PDF 정보 추가
            for node in nodes:
                if not hasattr(node, 'metadata'):
                    node.metadata = {}
                node.metadata['pdf_id'] = pdf_id
                node.metadata['pdf_name'] = self.pdf_metadata.get(pdf_id, {}).get('name', 'Unknown')
            all_nodes.extend(nodes)
        
        # Score 기준으로 정렬하고 상위 k개 선택
        all_nodes.sort(key=lambda x: x.score or 0, reverse=True)
        return all_nodes[:similarity_top_k]
