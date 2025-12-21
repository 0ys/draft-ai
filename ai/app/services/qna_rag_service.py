"""
Q&A PDF 문서를 위한 고성능 RAG 시스템

LlamaParse와 LlamaIndex를 사용하여 질문-답변 형식의 PDF 문서를 분석하고
효율적인 검색 및 답변 생성 시스템을 구축합니다.

설계 원칙:
- 각 PDF의 청크는 document_chunks 테이블에 저장됨 (pgvector 사용)
- PDF가 폴더를 변경해도 청크는 그대로 유지 (document_id로 연결)
- 쿼리 시 폴더의 PDF들을 각각 검색하여 결과 통합
- 재인덱싱 없음: 한번 인덱싱된 PDF는 DB에 영구 저장
"""

import os
import uuid
from pathlib import Path
from typing import Optional, List, Dict
from llama_index.core import (
    Settings,
    Document,
)
from llama_index.core.node_parser import MarkdownElementNodeParser
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_parse import LlamaParse
from app.core.database import Database


class QnARAGService:
    """Q&A PDF 문서를 위한 RAG 서비스 클래스"""

    def __init__(
        self,
        openai_api_key: str,
        llama_cloud_api_key: str,
    ):
        """
        QnARAGService 초기화

        Args:
            openai_api_key: OpenAI API 키
            llama_cloud_api_key: LlamaCloud API 키 (LlamaParse 사용)
        """
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
        
        # 임베딩 모델 저장 (청크 저장 시 사용)
        self.embed_model = Settings.embed_model

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

    def build_index_for_document(
        self,
        document_id: str,
        pdf_path: str,
        folder_id: Optional[str] = None,  # 폴더 정보는 메타데이터에만 저장
    ) -> bool:
        """
        특정 PDF 문서에 대한 인덱스 구축 (document_chunks 테이블에 저장)

        Args:
            document_id: 문서 ID (UUID)
            pdf_path: PDF 파일 경로
            folder_id: 폴더 ID (메타데이터용, 인덱스 구조에는 영향 없음)

        Returns:
            성공 여부
        """
        try:
            # 기존 청크가 있는지 확인 (재인덱싱 방지)
            db = Database.get_client()
            existing_chunks = (
                db.table("document_chunks")
                .select("id", count="exact")
                .eq("document_id", document_id)
                .execute()
            )
            
            if existing_chunks.count > 0:
                print(f"기존 인덱스가 있습니다. document_id={document_id}, 청크 수={existing_chunks.count}")
                return True
            
            # PDF 파싱
            documents = self._parse_pdf(pdf_path)
            
            # 노드 파서로 청크 생성
            node_parser = MarkdownElementNodeParser()
            all_nodes = []
            
            for doc in documents:
                # 메타데이터 추가
                if not hasattr(doc, 'metadata') or doc.metadata is None:
                    doc.metadata = {}
                doc.metadata['document_id'] = document_id
                doc.metadata['pdf_path'] = pdf_path
                doc.metadata['pdf_name'] = os.path.basename(pdf_path)
                
                # 노드로 변환
                nodes = node_parser.get_nodes_from_documents([doc])
                all_nodes.extend(nodes)
            
            print(f"총 {len(all_nodes)}개의 노드 생성")
            
            # 각 노드를 document_chunks 테이블에 저장
            db = Database.get_client()
            saved_count = 0
            
            for node in all_nodes:
                try:
                    # 노드 텍스트 임베딩 생성
                    embedding = self.embed_model.get_text_embedding(node.text)
                    
                    # 메타데이터 추출
                    node_metadata = node.metadata if hasattr(node, 'metadata') and node.metadata else {}
                    
                    # RPC 함수를 사용하여 document_chunks 테이블에 저장
                    # Supabase REST API는 VECTOR 타입을 직접 지원하지 않으므로 RPC 함수 사용
                    chunk_metadata = {
                        "pdf_name": node_metadata.get('pdf_name', os.path.basename(pdf_path)),
                        "pdf_path": node_metadata.get('pdf_path', pdf_path),
                        **{k: v for k, v in node_metadata.items() if k not in ['pdf_name', 'pdf_path']},
                    }
                    
                    # RPC 함수 호출
                    try:
                        result = db.rpc(
                            "insert_document_chunk",
                            {
                                "p_document_id": document_id,
                                "p_content": node.text,
                                "p_embedding": embedding,  # VECTOR 타입으로 저장
                                "p_metadata": chunk_metadata,
                            }
                        ).execute()
                        
                        if result.data:
                            saved_count += 1
                    except Exception as rpc_error:
                        # RPC 함수가 없거나 실패한 경우, 직접 insert 시도
                        print(f"RPC 함수 호출 실패, 직접 insert 시도: {rpc_error}")
                        try:
                            # Supabase는 VECTOR 타입을 직접 지원하지 않으므로
                            # 임베딩을 문자열로 변환하여 저장 (나중에 RPC 함수로 변환 필요)
                            # 또는 psycopg2를 사용하여 직접 저장
                            import json
                            chunk_data = {
                                "document_id": document_id,
                                "content": node.text,
                                "embedding": json.dumps(embedding),  # 임시로 JSON 문자열로 저장
                                "metadata": chunk_metadata,
                            }
                            result = db.table("document_chunks").insert(chunk_data).execute()
                            if result.data:
                                saved_count += 1
                                print(f"직접 insert 성공 (임시)")
                        except Exception as insert_error:
                            print(f"직접 insert도 실패: {insert_error}")
                            continue
                    
                except Exception as e:
                    print(f"청크 저장 실패: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
            
            print(f"document_chunks 테이블에 {saved_count}/{len(all_nodes)}개 청크 저장 완료")
            
            if saved_count > 0:
                return True
            else:
                print("경고: 저장된 청크가 없습니다.")
                return False
                
        except Exception as e:
            print(f"인덱스 구축 실패: {e}")
            import traceback
            traceback.print_exc()
            return False

    def remove_document_index(self, document_id: str) -> bool:
        """
        특정 PDF의 인덱스 제거 (document_chunks 테이블에서 삭제)

        Args:
            document_id: 문서 ID

        Returns:
            제거 성공 여부
        """
        try:
            # DB에서 청크 삭제 (CASCADE로 자동 삭제되지만 명시적으로 삭제)
            db = Database.get_client()
            result = (
                db.table("document_chunks")
                .delete()
                .eq("document_id", document_id)
                .execute()
            )
            
            print(f"PDF 인덱스 제거 완료 (DB): {document_id}")
            return True
        except Exception as e:
            print(f"PDF 인덱스 제거 실패: {e}")
            return False

    def query_documents(
        self,
        question: str,
        document_ids: List[str],
        similarity_top_k: int = 3,
    ) -> str:
        """
        여러 PDF 문서들에서 질문에 대한 답변 생성

        Args:
            question: 사용자 질문
            document_ids: 검색할 문서 ID 리스트
            similarity_top_k: 각 문서에서 검색할 관련 문서 수 (기본값: 3)

        Returns:
            생성된 답변
        """
        if not document_ids:
            raise ValueError("검색할 문서가 없습니다.")

        # 질문을 임베딩으로 변환
        query_embedding = self.embed_model.get_query_embedding(question)
        
        # pgvector를 사용하여 document_chunks 테이블에서 검색
        # Supabase의 경우 RPC 함수를 사용하거나 직접 SQL 쿼리 필요
        nodes = self._search_chunks_with_pgvector(
            query_embedding=query_embedding,
            document_ids=document_ids,
            similarity_top_k=similarity_top_k,
        )
        
        if not nodes:
            raise ValueError("검색 결과가 없습니다.")
        
        # 상위 k개 노드 선택
        top_nodes = nodes[:similarity_top_k]
        
        # 답변 생성
        from llama_index.core import Document
        from llama_index.core import VectorStoreIndex
        from llama_index.core.query_engine import RetrieverQueryEngine
        
        # 임시 인덱스 생성
        temp_docs = [Document(text=node['content'], metadata=node.get('metadata', {})) for node in top_nodes]
        temp_index = VectorStoreIndex.from_documents(temp_docs)
        temp_retriever = temp_index.as_retriever(similarity_top_k=len(top_nodes))
        query_engine = RetrieverQueryEngine.from_args(
            retriever=temp_retriever,
            response_mode="compact",
        )

        print(f"질문: {question} ({len(document_ids)}개 PDF에서 검색)")
        response = query_engine.query(question)
        answer = str(response) if response else ""
        print(f"답변 생성 완료: 길이={len(answer)}")

        return answer

    def _search_chunks_with_pgvector(
        self,
        query_embedding: List[float],
        document_ids: List[str],
        similarity_top_k: int,
    ) -> List[Dict]:
        """
        pgvector를 사용하여 document_chunks 테이블에서 검색
        
        Supabase RPC 함수를 사용하여 pgvector 검색 수행
        """
        try:
            db = Database.get_client()
            
            print(f"pgvector 검색 시작: document_ids={document_ids}, similarity_top_k={similarity_top_k}")
            print(f"query_embedding 길이: {len(query_embedding)}")
            
            # RPC 함수 호출 (pgvector 검색)
            result = db.rpc(
                "search_document_chunks",
                {
                    "query_embedding": query_embedding,
                    "document_ids": document_ids,
                    "match_count": similarity_top_k * 2,  # 필터링을 위해 더 많이 가져오기
                }
            ).execute()
            
            print(f"RPC 함수 호출 결과: {len(result.data) if result.data else 0}개 청크 반환")
            
            if not result.data:
                print("경고: RPC 함수가 빈 결과를 반환했습니다.")
                # RPC 함수가 없을 수 있으므로, 직접 쿼리로 폴백
                return self._search_chunks_fallback(query_embedding, document_ids, similarity_top_k)
            
            # 결과를 딕셔너리 리스트로 변환
            chunks = []
            for row in result.data:
                chunks.append({
                    'id': row.get('id'),
                    'document_id': row.get('document_id'),
                    'content': row.get('content'),
                    'metadata': row.get('metadata', {}),
                    'score': row.get('similarity', 0.0),
                })
            
            print(f"검색 완료: {len(chunks)}개 청크 반환")
            return chunks
            
        except Exception as e:
            print(f"pgvector 검색 실패: {e}")
            print("RPC 함수가 생성되지 않았을 수 있습니다. 폴백 방법을 시도합니다.")
            import traceback
            traceback.print_exc()
            # 폴백: 직접 쿼리
            return self._search_chunks_fallback(query_embedding, document_ids, similarity_top_k)
    
    def _search_chunks_fallback(
        self,
        query_embedding: List[float],
        document_ids: List[str],
        similarity_top_k: int,
    ) -> List[Dict]:
        """
        RPC 함수가 없을 때 폴백: 직접 쿼리로 검색
        """
        try:
            db = Database.get_client()
            
            print("폴백: 직접 쿼리로 청크 검색")
            
            # document_chunks 테이블에서 해당 document_ids의 모든 청크 가져오기
            all_chunks = (
                db.table("document_chunks")
                .select("*")
                .in_("document_id", document_ids)
                .execute()
            )
            
            if not all_chunks.data:
                print("폴백 검색: 청크가 없습니다.")
                return []
            
            print(f"폴백 검색: {len(all_chunks.data)}개 청크 발견, 유사도 계산 중...")
            
            # 각 청크의 임베딩과 쿼리 임베딩의 유사도 계산
            scored_chunks = []
            for chunk in all_chunks.data:
                if chunk.get('embedding'):
                    # 임베딩이 문자열로 저장되어 있을 수 있으므로 변환
                    chunk_embedding = chunk['embedding']
                    if isinstance(chunk_embedding, str):
                        import json
                        try:
                            chunk_embedding = json.loads(chunk_embedding)
                        except:
                            continue
                    
                    similarity = self._cosine_similarity(query_embedding, chunk_embedding)
                    scored_chunks.append({
                        'id': chunk['id'],
                        'document_id': chunk['document_id'],
                        'content': chunk['content'],
                        'metadata': chunk.get('metadata', {}),
                        'score': similarity,
                    })
            
            # 점수 순으로 정렬
            scored_chunks.sort(key=lambda x: x['score'], reverse=True)
            
            print(f"폴백 검색 완료: {len(scored_chunks)}개 청크 반환")
            return scored_chunks[:similarity_top_k * 2]
            
        except Exception as e:
            print(f"폴백 검색 실패: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _cosine_similarity(self, vec1: List[float], vec2) -> float:
        """
        코사인 유사도 계산
        
        vec2는 리스트 또는 문자열일 수 있음
        """
        try:
            # vec2가 문자열이면 파싱
            if isinstance(vec2, str):
                import json
                vec2 = json.loads(vec2)
            
            # 벡터 길이 계산
            import numpy as np
            vec1 = np.array(vec1)
            vec2 = np.array(vec2)
            
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return float(dot_product / (norm1 * norm2))
        except Exception as e:
            print(f"유사도 계산 실패: {e}")
            return 0.0

    def get_retrieved_nodes_from_documents(
        self,
        question: str,
        document_ids: List[str],
        similarity_top_k: int = 3,
    ) -> List:
        """
        여러 PDF 문서들에서 질문에 대한 관련 노드(청크) 검색

        Args:
            question: 사용자 질문
            document_ids: 검색할 문서 ID 리스트
            similarity_top_k: 각 문서에서 검색할 관련 문서 수

        Returns:
            검색된 노드 리스트 (점수 순으로 정렬)
        """
        if not document_ids:
            return []

        # 질문을 임베딩으로 변환
        query_embedding = self.embed_model.get_query_embedding(question)
        
        # pgvector를 사용하여 검색
        chunks = self._search_chunks_with_pgvector(
            query_embedding=query_embedding,
            document_ids=document_ids,
            similarity_top_k=similarity_top_k * 2,  # 필터링을 위해 더 많이 가져오기
        )
        
        # LlamaIndex Node 형식으로 변환
        from llama_index.core.schema import NodeWithScore, TextNode
        
        nodes = []
        for chunk in chunks:
            node = TextNode(
                text=chunk['content'],
                metadata={
                    'document_id': chunk['document_id'],
                    'pdf_name': chunk.get('metadata', {}).get('pdf_name', 'Unknown'),
                    **chunk.get('metadata', {}),
                }
            )
            node_with_score = NodeWithScore(
                node=node,
                score=chunk.get('score', 0.0),
            )
            nodes.append(node_with_score)
        
        # 점수 순으로 정렬
        nodes.sort(key=lambda x: x.score or 0, reverse=True)
        
        return nodes[:similarity_top_k]
