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
import re
import json
from pathlib import Path
from typing import Optional, List, Dict
from llama_index.core import (
    Settings,
    Document,
)
from llama_index.core.node_parser import MarkdownElementNodeParser
from llama_index.core.schema import TextNode
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
        
        # LLM 인스턴스 저장 (구조화 파싱용)
        self.llm = Settings.llm

    def _parse_qna_pairs_with_llm(self, text: str) -> List[Dict[str, str]]:
        """
        LLM을 사용하여 질문-답변 쌍을 구조화된 방식으로 추출
        
        정규표현식으로 파싱하기 어려운 복잡한 형식도 처리 가능
        
        Args:
            text: 마크다운 텍스트
            
        Returns:
            질문-답변 쌍 리스트 [{"question": "...", "answer": "..."}, ...]
        """
        try:
            # 프롬프트 구성
            prompt = f"""다음 텍스트에서 질문과 답변 쌍을 추출해주세요.
텍스트에 질문과 답변이 명확하게 구분되어 있다면, 각 쌍을 JSON 형식으로 반환해주세요.

텍스트:
{text[:8000]}  # 텍스트가 너무 길면 잘라서 처리

다음 JSON 형식으로 응답해주세요:
{{
  "qa_pairs": [
    {{"question": "질문 내용", "answer": "답변 내용"}},
    ...
  ]
}}

질문-답변 쌍이 없다면 빈 배열을 반환해주세요."""

            # LLM 호출 (구조화된 출력)
            response = self.llm.complete(prompt)
            response_text = str(response).strip()
            
            # JSON 추출 시도
            # 응답이 마크다운 코드 블록으로 감싸져 있을 수 있음
            if "```json" in response_text:
                response_text = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
                if response_text:
                    response_text = response_text.group(1)
            elif "```" in response_text:
                response_text = re.search(r'```\s*(.*?)\s*```', response_text, re.DOTALL)
                if response_text:
                    response_text = response_text.group(1)
            
            # JSON 파싱
            try:
                result = json.loads(response_text)
                qa_pairs = result.get("qa_pairs", [])
                
                # 유효성 검사
                valid_pairs = []
                for pair in qa_pairs:
                    if isinstance(pair, dict) and "question" in pair and "answer" in pair:
                        question = str(pair["question"]).strip()
                        answer = str(pair["answer"]).strip()
                        if question and answer:
                            valid_pairs.append({"question": question, "answer": answer})
                
                if valid_pairs:
                    print(f"LLM으로 {len(valid_pairs)}개의 Q&A 쌍 추출 성공")
                    return valid_pairs
            except json.JSONDecodeError as e:
                print(f"LLM 응답 JSON 파싱 실패: {e}")
                print(f"응답 내용: {response_text[:500]}")
        
        except Exception as e:
            print(f"LLM 기반 파싱 실패: {e}")
            import traceback
            traceback.print_exc()
        
        return []

    def _parse_qna_pairs_with_markdown_structure(self, text: str) -> List[Dict[str, str]]:
        """
        마크다운 구조를 분석하여 질문-답변 쌍 추출
        
        헤더, 리스트, 블록 인용 등의 마크다운 구조를 활용
        
        Args:
            text: 마크다운 텍스트
            
        Returns:
            질문-답변 쌍 리스트
        """
        qna_pairs = []
        
        # 마크다운 헤더 기반 분할 (# 질문, ## 답변 등)
        # 헤더 패턴: # 질문, ## 답변, ### 질문 등
        header_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        sections = []
        current_section = {"level": 0, "title": "", "content": []}
        
        lines = text.split('\n')
        for line in lines:
            header_match = header_pattern.match(line)
            if header_match:
                # 이전 섹션 저장
                if current_section["title"]:
                    sections.append(current_section.copy())
                
                # 새 섹션 시작
                current_section = {
                    "level": len(header_match.group(1)),
                    "title": header_match.group(2).strip(),
                    "content": []
                }
            else:
                if line.strip():
                    current_section["content"].append(line)
        
        # 마지막 섹션 저장
        if current_section["title"]:
            sections.append(current_section)
        
        # 섹션들을 질문-답변 쌍으로 매칭
        # 인접한 섹션이 질문/답변일 가능성 체크
        for i in range(len(sections) - 1):
            section1 = sections[i]
            section2 = sections[i + 1]
            
            title1 = section1["title"].lower()
            title2 = section2["title"].lower()
            content1 = '\n'.join(section1["content"]).strip()
            content2 = '\n'.join(section2["content"]).strip()
            
            # 질문/답변 패턴 감지
            is_qna = False
            question = ""
            answer = ""
            
            # 패턴 1: 제목에 "질문", "답변" 키워드
            if any(keyword in title1 for keyword in ["질문", "question", "q"]) and \
               any(keyword in title2 for keyword in ["답변", "answer", "a"]):
                question = content1 if content1 else section1["title"]
                answer = content2 if content2 else section2["title"]
                is_qna = True
            # 패턴 2: 첫 번째 섹션이 질문처럼 보이고 두 번째가 답변
            elif "?" in title1 or "?" in content1[:100]:
                question = content1 if content1 else section1["title"]
                answer = content2 if content2 else section2["title"]
                is_qna = True
            
            if is_qna and question and answer:
                qna_pairs.append({"question": question, "answer": answer})
        
        # 리스트 기반 Q&A 추출
        # 번호가 매겨진 리스트에서 질문-답변 추출
        list_pattern = re.compile(r'^\s*(\d+)[\.\)]\s*(.+?)(?=\n\s*\d+[\.\)]|$)', re.MULTILINE | re.DOTALL)
        list_items = list_pattern.findall(text)
        
        # 짝수 개의 리스트 아이템을 질문-답변 쌍으로 매칭
        for i in range(0, len(list_items) - 1, 2):
            question = list_items[i][1].strip()
            answer = list_items[i + 1][1].strip()
            if question and answer and len(question) < 500:  # 질문이 너무 길면 제외
                qna_pairs.append({"question": question, "answer": answer})
        
        return qna_pairs

    def _parse_qna_pairs_from_text(self, text: str, use_llm: bool = True) -> List[Dict[str, str]]:
        """
        마크다운 텍스트에서 질문-답변 쌍을 추출
        
        여러 방법을 순차적으로 시도:
        1. 정규표현식 기반 파싱 (빠름)
        2. 마크다운 구조 분석 (중간)
        3. LLM 기반 구조화 파싱 (정확하지만 느리고 비용 발생)
        
        Args:
            text: 마크다운 텍스트
            use_llm: LLM 기반 파싱 사용 여부 (기본값: True)
            
        Returns:
            질문-답변 쌍 리스트 [{"question": "...", "answer": "..."}, ...]
        """
        qna_pairs = []
        
        # 방법 1: 정규표현식 기반 파싱 (가장 빠름)
        # 패턴 1: Q: / A: 형식 (영문)
        pattern1 = re.compile(
            r'(?:^|\n)\s*(?:Q|Question)[:\.]\s*(.+?)(?:\n\s*(?:A|Answer)[:\.]\s*(.+?))(?=\n\s*(?:Q|Question)[:\.]|$)',
            re.DOTALL | re.IGNORECASE | re.MULTILINE
        )
        
        # 패턴 2: 질문: / 답변: 형식 (한글)
        pattern2 = re.compile(
            r'(?:^|\n)\s*질문[:\.]\s*(.+?)(?:\n\s*답변[:\.]\s*(.+?))(?=\n\s*질문[:\.]|$)',
            re.DOTALL | re.MULTILINE
        )
        
        # 패턴 3: Q1. / A1. 형식 (번호 포함)
        pattern3 = re.compile(
            r'(?:^|\n)\s*(?:Q|Question)\s*\d+[:\.]\s*(.+?)(?:\n\s*(?:A|Answer)\s*\d+[:\.]\s*(.+?))(?=\n\s*(?:Q|Question)\s*\d+[:\.]|$)',
            re.DOTALL | re.IGNORECASE | re.MULTILINE
        )
        
        # 패턴 4: 번호. 질문\n   답변 (들여쓰기로 구분)
        pattern4 = re.compile(
            r'(?:^|\n)\s*(\d+)[:\.]\s*(.+?)(?:\n\s{2,}(.+?))(?=\n\s*\d+[:\.]|$)',
            re.DOTALL | re.MULTILINE
        )
        
        # 모든 패턴 시도
        all_matches = []
        
        for match in pattern1.finditer(text):
            question = match.group(1).strip()
            answer = match.group(2).strip() if match.lastindex >= 2 else ""
            if question and answer:
                all_matches.append((match.start(), {"question": question, "answer": answer}))
        
        for match in pattern2.finditer(text):
            question = match.group(1).strip()
            answer = match.group(2).strip() if match.lastindex >= 2 else ""
            if question and answer:
                all_matches.append((match.start(), {"question": question, "answer": answer}))
        
        for match in pattern3.finditer(text):
            question = match.group(1).strip()
            answer = match.group(2).strip() if match.lastindex >= 2 else ""
            if question and answer:
                all_matches.append((match.start(), {"question": question, "answer": answer}))
        
        for match in pattern4.finditer(text):
            question = match.group(2).strip()
            answer = match.group(3).strip() if match.lastindex >= 3 else ""
            if question and answer:
                all_matches.append((match.start(), {"question": question, "answer": answer}))
        
        # 위치 순으로 정렬하고 중복 제거
        all_matches.sort(key=lambda x: x[0])
        seen = set()
        for pos, pair in all_matches:
            pair_key = (pair["question"][:50], pair["answer"][:50])  # 처음 50자로 중복 체크
            if pair_key not in seen:
                seen.add(pair_key)
                qna_pairs.append(pair)
        
        # 방법 2: 정규표현식이 실패하면 마크다운 구조 분석 시도
        if not qna_pairs:
            print("정규표현식 파싱 실패, 마크다운 구조 분석 시도...")
            qna_pairs = self._parse_qna_pairs_with_markdown_structure(text)
        
        # 방법 3: 마크다운 구조 분석도 실패하면 LLM 사용 (옵션)
        if not qna_pairs and use_llm:
            print("마크다운 구조 분석 실패, LLM 기반 파싱 시도...")
            llm_pairs = self._parse_qna_pairs_with_llm(text)
            if llm_pairs:
                qna_pairs = llm_pairs
        
        # 방법 4: 최후의 수단 - 줄 단위 파싱
        if not qna_pairs:
            # 줄 단위로 분할하여 질문/답변 구분 시도
            lines = text.split('\n')
            current_question = None
            current_answer = []
            
            for line in lines:
                line_stripped = line.strip()
                # 질문 시작 패턴 감지
                if re.match(r'^(?:Q|Question|질문)[:\.]', line_stripped, re.IGNORECASE):
                    # 이전 Q&A 쌍 저장
                    if current_question and current_answer:
                        qna_pairs.append({
                            "question": current_question,
                            "answer": "\n".join(current_answer).strip()
                        })
                    # 새 질문 시작
                    current_question = re.sub(r'^(?:Q|Question|질문)[:\.]\s*', '', line_stripped, flags=re.IGNORECASE)
                    current_answer = []
                # 답변 시작 패턴 감지
                elif re.match(r'^(?:A|Answer|답변)[:\.]', line_stripped, re.IGNORECASE):
                    answer_text = re.sub(r'^(?:A|Answer|답변)[:\.]\s*', '', line_stripped, flags=re.IGNORECASE)
                    if current_question:
                        current_answer.append(answer_text)
                # 답변 내용 계속
                elif current_question and line_stripped:
                    current_answer.append(line_stripped)
            
            # 마지막 Q&A 쌍 저장
            if current_question and current_answer:
                qna_pairs.append({
                    "question": current_question,
                    "answer": "\n".join(current_answer).strip()
                })
        
        return qna_pairs

    def _create_qna_nodes_from_documents(
        self,
        documents: List[Document],
        document_id: str,
        pdf_path: str,
    ) -> List[TextNode]:
        """
        Document 리스트에서 질문-답변 쌍을 추출하여 TextNode 리스트 생성
        
        Args:
            documents: LlamaParse로 파싱된 Document 리스트
            document_id: 문서 ID
            pdf_path: PDF 파일 경로
            
        Returns:
            질문-답변 쌍으로 구성된 TextNode 리스트
        """
        all_nodes = []
        pdf_name = os.path.basename(pdf_path)
        
        for doc_idx, doc in enumerate(documents):
            doc_text = doc.text if hasattr(doc, 'text') else str(doc)
            
            # 질문-답변 쌍 추출 (LLM 사용 옵션 포함)
            # 텍스트가 짧으면 LLM 사용 안 함 (비용 절감)
            use_llm = len(doc_text) > 500 and len(doc_text) < 10000  # 적당한 길이일 때만
            qna_pairs = self._parse_qna_pairs_from_text(doc_text, use_llm=use_llm)
            
            if qna_pairs:
                print(f"문서 {doc_idx + 1}에서 {len(qna_pairs)}개의 Q&A 쌍 추출")
                
                for qna_idx, qna_pair in enumerate(qna_pairs):
                    # 질문과 답변을 하나의 텍스트로 결합
                    # 형식: "질문: {question}\n답변: {answer}"
                    combined_text = f"질문: {qna_pair['question']}\n답변: {qna_pair['answer']}"
                    
                    # 메타데이터 구성
                    node_metadata = {
                        'document_id': document_id,
                        'pdf_path': pdf_path,
                        'pdf_name': pdf_name,
                        'qna_index': qna_idx + 1,
                        'question': qna_pair['question'],
                        'answer': qna_pair['answer'],
                        'chunk_type': 'qna_pair',
                    }
                    
                    # 원본 문서의 메타데이터 병합
                    if hasattr(doc, 'metadata') and doc.metadata:
                        node_metadata.update({
                            k: v for k, v in doc.metadata.items() 
                            if k not in ['document_id', 'pdf_path', 'pdf_name']
                        })
                    
                    # TextNode 생성
                    node = TextNode(
                        text=combined_text,
                        metadata=node_metadata,
                    )
                    all_nodes.append(node)
            else:
                # Q&A 쌍을 찾지 못한 경우, 원본 텍스트를 그대로 사용
                # (MarkdownElementNodeParser로 폴백)
                print(f"문서 {doc_idx + 1}에서 Q&A 쌍을 찾지 못함. 원본 텍스트 사용")
                node_parser = MarkdownElementNodeParser()
                fallback_nodes = node_parser.get_nodes_from_documents([doc])
                
                for node in fallback_nodes:
                    # 메타데이터 추가
                    if not hasattr(node, 'metadata') or node.metadata is None:
                        node.metadata = {}
                    node.metadata['document_id'] = document_id
                    node.metadata['pdf_path'] = pdf_path
                    node.metadata['pdf_name'] = pdf_name
                    node.metadata['chunk_type'] = 'fallback'
                
                all_nodes.extend(fallback_nodes)
        
        return all_nodes

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
            
            # 질문-답변 쌍으로 노드 생성
            all_nodes = self._create_qna_nodes_from_documents(
                documents=documents,
                document_id=document_id,
                pdf_path=pdf_path,
            )
            
            print(f"총 {len(all_nodes)}개의 Q&A 쌍 노드 생성")
            
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
