"""
배치 인덱싱 서비스

주기적으로 DB에서 'uploaded' 또는 'failed' 상태의 문서를 찾아서 인덱싱합니다.
"""
import os
from pathlib import Path
from typing import List, Dict
from datetime import datetime
from app.core.database import Database
from app.services.qna_rag_service import QnARAGService
from app.core.config import get_settings


class BatchIndexingService:
    """배치 인덱싱 서비스 클래스"""
    
    def __init__(self):
        """배치 인덱싱 서비스 초기화"""
        self.settings = get_settings()
        self.rag_service = None
        
    def _get_rag_service(self) -> QnARAGService:
        """RAG 서비스 인스턴스 반환 (지연 초기화)"""
        if self.rag_service is None:
            if not self.settings.openai_api_key or not self.settings.llama_cloud_api_key:
                raise ValueError("OpenAI API 키 또는 LlamaCloud API 키가 설정되지 않았습니다.")
            self.rag_service = QnARAGService(
                openai_api_key=self.settings.openai_api_key,
                llama_cloud_api_key=self.settings.llama_cloud_api_key,
            )
        return self.rag_service
    
    def get_pending_documents(self, limit: int = 10) -> List[Dict]:
        """
        인덱싱이 필요한 문서 목록 조회
        
        Args:
            limit: 최대 조회 개수
            
        Returns:
            인덱싱이 필요한 문서 목록
        """
        db = Database.get_client()
        
        try:
            # 삭제되지 않은 문서 중 'uploaded' 또는 'failed' 상태인 문서 조회
            # PDF 파일만 조회
            result = (
                db.table("documents")
                .select("*")
                .in_("status", ["uploaded", "failed"])
                .eq("content_type", "application/pdf")
                .is_("deleted_at", "null")
                .order("created_at", desc=False)  # 오래된 것부터 처리
                .limit(limit)
                .execute()
            )
            
            return result.data if result.data else []
        except Exception as e:
            print(f"대기 중인 문서 조회 실패: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def process_document(self, document: Dict) -> bool:
        """
        단일 문서 인덱싱 처리
        
        Args:
            document: 문서 정보 딕셔너리
            
        Returns:
            성공 여부
        """
        db = Database.get_client()
        document_id = document.get("id")
        file_path = document.get("file_path")
        folder_id = document.get("folder_id")
        
        if not document_id or not file_path:
            print(f"문서 정보가 불완전합니다: document_id={document_id}, file_path={file_path}")
            return False
        
        # 상대 경로를 절대 경로로 변환
        try:
            # 현재 작업 디렉토리 기준으로 절대 경로 계산
            cwd = Path.cwd()
            absolute_path = str((cwd / file_path).resolve())
            
            # 파일 존재 여부 확인
            if not os.path.exists(absolute_path):
                print(f"파일을 찾을 수 없습니다: {absolute_path}")
                # 상태를 'failed'로 업데이트
                db.table("documents").update({
                    "status": "failed",
                    "updated_at": datetime.now().isoformat(),
                }).eq("id", document_id).execute()
                return False
        except Exception as e:
            print(f"파일 경로 변환 실패: {e}")
            db.table("documents").update({
                "status": "failed",
                "updated_at": datetime.now().isoformat(),
            }).eq("id", document_id).execute()
            return False
        
        try:
            # 상태를 'processing'으로 업데이트
            db.table("documents").update({
                "status": "processing",
                "updated_at": datetime.now().isoformat(),
            }).eq("id", document_id).execute()
            
            # RAG 서비스로 인덱싱
            rag_service = self._get_rag_service()
            success = rag_service.build_index_for_document(
                document_id=document_id,
                pdf_path=absolute_path,
                folder_id=folder_id,
            )
            
            if success:
                # 상태를 'completed'로 업데이트
                db.table("documents").update({
                    "status": "completed",
                    "updated_at": datetime.now().isoformat(),
                }).eq("id", document_id).execute()
                print(f"문서 인덱싱 완료: {document_id} ({document.get('original_filename', 'unknown')})")
                return True
            else:
                # 상태를 'failed'로 업데이트
                db.table("documents").update({
                    "status": "failed",
                    "updated_at": datetime.now().isoformat(),
                }).eq("id", document_id).execute()
                print(f"문서 인덱싱 실패: {document_id} ({document.get('original_filename', 'unknown')})")
                return False
                
        except Exception as e:
            # 에러 발생 시 상태를 'failed'로 업데이트
            try:
                db.table("documents").update({
                    "status": "failed",
                    "updated_at": datetime.now().isoformat(),
                }).eq("id", document_id).execute()
            except:
                pass
            print(f"문서 인덱싱 중 에러 발생: {e}")
            print(f"  - document_id: {document_id}")
            print(f"  - file_path: {file_path}")
            import traceback
            traceback.print_exc()
            return False
    
    def run_batch(self, limit: int = 10) -> Dict[str, int]:
        """
        배치 인덱싱 실행
        
        Args:
            limit: 한 번에 처리할 최대 문서 수
            
        Returns:
            처리 결과 통계
        """
        print(f"[배치 인덱싱] 시작: {datetime.now().isoformat()}")
        
        # 대기 중인 문서 조회
        pending_documents = self.get_pending_documents(limit=limit)
        
        if not pending_documents:
            print(f"[배치 인덱싱] 처리할 문서가 없습니다.")
            return {
                "total": 0,
                "success": 0,
                "failed": 0,
            }
        
        print(f"[배치 인덱싱] {len(pending_documents)}개 문서 처리 시작")
        
        success_count = 0
        failed_count = 0
        
        for doc in pending_documents:
            doc_id = doc.get("id")
            filename = doc.get("original_filename", "unknown")
            status = doc.get("status", "unknown")
            print(f"[배치 인덱싱] 처리 중: {filename} (id={doc_id}, status={status})")
            
            if self.process_document(doc):
                success_count += 1
            else:
                failed_count += 1
        
        result = {
            "total": len(pending_documents),
            "success": success_count,
            "failed": failed_count,
        }
        
        print(f"[배치 인덱싱] 완료: 총 {result['total']}개, 성공 {result['success']}개, 실패 {result['failed']}개")
        
        return result
