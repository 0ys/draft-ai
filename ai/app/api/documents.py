from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from typing import Optional, List
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.core.config import get_settings
from app.services.qna_rag_service import QnARAGService
from supabase import Client

router = APIRouter()

# 업로드된 파일을 저장할 디렉토리
UPLOAD_DIR = Path("storage")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# RAG 서비스 인스턴스 (싱글톤 패턴)
_rag_service: Optional[QnARAGService] = None


def get_rag_service() -> QnARAGService:
    """RAG 서비스 인스턴스 반환 (싱글톤)"""
    global _rag_service
    if _rag_service is None:
        settings = get_settings()
        if not settings.openai_api_key or not settings.llama_cloud_api_key:
            raise ValueError("OpenAI API 키 또는 LlamaCloud API 키가 설정되지 않았습니다.")
        _rag_service = QnARAGService(
            openai_api_key=settings.openai_api_key,
            llama_cloud_api_key=settings.llama_cloud_api_key,
        )
    return _rag_service


async def index_document_background(
    document_id: str,
    pdf_path: str,
    folder_id: Optional[str],
    user_id: str,
):
    """
    백그라운드에서 문서 인덱싱 수행
    
    Args:
        document_id: 문서 ID
        pdf_path: PDF 파일 경로
        folder_id: 폴더 ID
        user_id: 사용자 ID
    """
    from app.core.database import Database
    db = Database.get_client()
    
    try:
        # 상태를 'processing'으로 업데이트
        db.table("documents").update({
            "status": "processing",
            "updated_at": datetime.now().isoformat(),
        }).eq("id", document_id).execute()
        
        # PDF 파일만 인덱싱
        if not pdf_path.lower().endswith('.pdf'):
            print(f"PDF가 아닌 파일은 인덱싱하지 않습니다: {pdf_path}")
            db.table("documents").update({
                "status": "completed",
                "updated_at": datetime.now().isoformat(),
            }).eq("id", document_id).execute()
            return
        
        # RAG 서비스로 인덱싱 (PDF 단위 인덱싱, folder_id는 무시)
        rag_service = get_rag_service()
        success = rag_service.build_index_for_document(
            document_id=document_id,
            pdf_path=pdf_path,
            folder_id=folder_id,  # 메타데이터용, 인덱스 구조에는 영향 없음
        )
        
        if success:
            # 상태를 'completed'로 업데이트
            db.table("documents").update({
                "status": "completed",
                "updated_at": datetime.now().isoformat(),
            }).eq("id", document_id).execute()
            print(f"문서 인덱싱 완료: {document_id}")
        else:
            # 상태를 'failed'로 업데이트
            db.table("documents").update({
                "status": "failed",
                "updated_at": datetime.now().isoformat(),
            }).eq("id", document_id).execute()
            print(f"문서 인덱싱 실패: {document_id}")
            
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
        import traceback
        traceback.print_exc()


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder_id: Optional[str] = None,  # UUID 형식
    user_id: str = "00000000-0000-0000-0000-000000000001",  # UUID 형식으로 변경
    db: Client = Depends(get_db),
):
    """
    문서 파일을 업로드합니다.
    
    - **file**: 업로드할 파일 (PDF, DOCX, DOC)
    - **folder_id**: 문서를 저장할 폴더 ID (UUID, 선택사항)
    - **user_id**: 사용자 ID (UUID 형식)
    """
    # 파일 크기 제한: 50MB
    MAX_FILE_SIZE = 50 * 1024 * 1024
    
    # 파일 타입 검증
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ]
    
    # 파일 확장자 검증
    file_extension = file.filename.split(".")[-1].lower() if file.filename else ""
    allowed_extensions = ["pdf", "docx", "doc"]
    
    # 파일 타입 및 확장자 검증
    if file.content_type not in allowed_types and file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="PDF 또는 DOCX 파일만 업로드 가능합니다."
        )
    
    # 파일 읽기
    contents = await file.read()
    
    # 파일 크기 검증
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="파일 크기는 최대 50MB까지 업로드 가능합니다."
        )
    
    # 저장할 파일명 생성 (중복 방지를 위해 타임스탬프 + UUID 사용)
    original_filename = file.filename or "unknown"
    file_extension = original_filename.split(".")[-1] if "." in original_filename else ""
    safe_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{file_extension}"
    
    # 파일 저장 디렉토리 (user_id별로 분리)
    save_dir = UPLOAD_DIR / user_id
    save_dir.mkdir(parents=True, exist_ok=True)
    
    # 파일 저장
    file_path = save_dir / safe_filename
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # 저장된 파일의 절대 경로
    absolute_path = str(file_path.resolve())
    
    # 상대 경로 계산 (안전하게)
    try:
        # 절대 경로를 기준으로 상대 경로 계산
        abs_file_path = file_path.resolve()
        abs_cwd = Path.cwd().resolve()
        if str(abs_file_path).startswith(str(abs_cwd)):
            relative_path = str(abs_file_path.relative_to(abs_cwd))
        else:
            # 상대 경로로 직접 계산
            relative_path = str(file_path)
    except (ValueError, AttributeError):
        # 에러 발생 시 상대 경로 사용
        relative_path = str(file_path)
    
    # DB에 문서 정보 저장
    try:
        document_data = {
            "user_id": user_id,
            "folder_id": folder_id,  # folder_id 사용 (NULL 가능)
            "original_filename": original_filename,
            "saved_filename": safe_filename,
            "file_path": relative_path,
            "file_size": len(contents),
            "content_type": file.content_type,
            "status": "processing",  # processing, completed, failed
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        
        result = db.table("documents").insert(document_data).execute()
        document_id = result.data[0]["id"] if result.data else None
    except Exception as e:
        # DB 저장 실패 시에도 파일은 저장되어 있으므로 경고만
        print(f"DB 저장 실패: {e}")
        document_id = None
    
    # PDF 파일인 경우 백그라운드 인덱싱 작업 추가
    if document_id and file_extension.lower() == "pdf":
        background_tasks.add_task(
            index_document_background,
            document_id=document_id,
            pdf_path=absolute_path,
            folder_id=folder_id,
            user_id=user_id,
        )
    
    # 파일 정보 반환
    return {
        "success": True,
        "document_id": document_id,
        "filename": original_filename,
        "saved_filename": safe_filename,
        "content_type": file.content_type,
        "size": len(contents),
        "folder_id": folder_id,
        "file_path": relative_path,
        "absolute_path": absolute_path,
        "status": "processing" if document_id and file_extension.lower() == "pdf" else "completed",
        "message": "파일이 성공적으로 업로드되었습니다.",
    }


@router.get("/list")
async def list_documents(
    user_id: str = "00000000-0000-0000-0000-000000000001",  # UUID 형식
    folder_id: Optional[str] = None,  # UUID 형식
    db: Client = Depends(get_db),
):
    """
    사용자의 문서 목록을 조회합니다.
    
    - **user_id**: 사용자 ID (UUID)
    - **folder_id**: 특정 폴더 ID로 필터링 (선택사항, UUID)
    """
    try:
        query = db.table("documents").select("*").eq("user_id", user_id)
        
        # 소프트 딜리트 필터링
        query = query.is_("deleted_at", "null")
        
        # 폴더 ID 필터링
        if folder_id:
            query = query.eq("folder_id", folder_id)
        
        # 생성일 기준 내림차순 정렬
        query = query.order("created_at", desc=True)
        
        result = query.execute()
        
        return {
            "success": True,
            "documents": result.data,
            "count": len(result.data),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"문서 목록 조회 실패: {str(e)}"
        )


@router.get("/folders")
async def list_folders(
    user_id: str = "00000000-0000-0000-0000-000000000001",  # UUID 형식
    db: Client = Depends(get_db),
):
    """
    사용자의 폴더 목록을 조회합니다.
    '최근 문서함' 폴더가 없으면 자동으로 생성합니다.
    
    - **user_id**: 사용자 ID (UUID)
    """
    try:
        # '최근 문서함' 폴더가 있는지 확인
        recent_folder_result = (
            db.table("folders")
            .select("*")
            .eq("user_id", user_id)
            .eq("name", "최근 문서함")
            .is_("deleted_at", "null")
            .execute()
        )
        
        # '최근 문서함' 폴더가 없으면 생성
        if not recent_folder_result.data or len(recent_folder_result.data) == 0:
            new_folder = {
                "user_id": user_id,
                "name": "최근 문서함",
                "parent_id": None,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }
            create_result = db.table("folders").insert(new_folder).execute()
            recent_folder_id = create_result.data[0]["id"] if create_result.data else None
        else:
            recent_folder_id = recent_folder_result.data[0]["id"]
        
        # folders 테이블에서 사용자의 폴더 조회
        result = (
            db.table("folders")
            .select("*")
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .order("created_at", desc=False)
            .execute()
        )
        
        # 각 폴더별 문서 개수 계산
        folder_list = []
        for folder in result.data:
            count_result = (
                db.table("documents")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .eq("folder_id", folder["id"])
                .is_("deleted_at", "null")
                .execute()
            )
            folder_list.append({
                "id": folder["id"],
                "name": folder["name"],
                "parent_id": folder.get("parent_id"),
                "document_count": count_result.count if hasattr(count_result, "count") else len(count_result.data),
                "created_at": folder["created_at"],
            })
        
        # folder_id가 NULL인 문서들을 '최근 문서함'으로 이동 (기존 루트 폴더 문서들)
        root_docs_result = (
            db.table("documents")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .is_("folder_id", "null")
            .is_("deleted_at", "null")
            .execute()
        )
        root_doc_count = root_docs_result.count if hasattr(root_docs_result, "count") else len(root_docs_result.data)
        
        # folder_id가 NULL인 문서들을 '최근 문서함'으로 이동
        if root_doc_count > 0 and recent_folder_id:
            try:
                db.table("documents").update({
                    "folder_id": recent_folder_id,
                    "updated_at": datetime.now().isoformat(),
                }).eq("user_id", user_id).is_("folder_id", "null").is_("deleted_at", "null").execute()
                
                # '최근 문서함' 폴더의 문서 개수 업데이트
                for folder in folder_list:
                    if folder["id"] == recent_folder_id:
                        folder["document_count"] += root_doc_count
                        break
            except Exception as e:
                print(f"문서 이동 실패 (무시 가능): {e}")
        
        # '최근 문서함' 폴더를 맨 앞으로 이동
        recent_folder = None
        other_folders = []
        for folder in folder_list:
            if folder["id"] == recent_folder_id:
                recent_folder = folder
            else:
                other_folders.append(folder)
        
        if recent_folder:
            folder_list = [recent_folder] + other_folders
        
        return {
            "success": True,
            "folders": folder_list,
            "count": len(folder_list),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"폴더 목록 조회 실패: {str(e)}"
        )


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,  # UUID 형식
    user_id: str = "00000000-0000-0000-0000-000000000001",  # UUID 형식
    db: Client = Depends(get_db),
):
    """
    문서를 삭제합니다 (소프트 딜리트).
    
    - **document_id**: 삭제할 문서 ID (UUID)
    - **user_id**: 사용자 ID (UUID 형식)
    """
    try:
        # 문서 존재 여부 및 소유자 확인
        doc_result = (
            db.table("documents")
            .select("*")
            .eq("id", document_id)
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .execute()
        )
        
        if not doc_result.data or len(doc_result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail="문서를 찾을 수 없거나 이미 삭제되었습니다."
            )
        
        document = doc_result.data[0]
        folder_id = document.get("folder_id")
        
        # 소프트 딜리트: deleted_at 필드 업데이트
        update_result = (
            db.table("documents")
            .update({
                "deleted_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            })
            .eq("id", document_id)
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .execute()
        )
        
        if not update_result.data:
            raise HTTPException(
                status_code=500,
                detail="문서 삭제에 실패했습니다."
            )
        
        # PDF 파일인 경우 인덱스에서도 제거
        if document.get("content_type") == "application/pdf":
            try:
                rag_service = get_rag_service()
                rag_service.remove_document_index(document_id=document_id)
            except Exception as e:
                print(f"인덱스에서 문서 제거 실패 (무시 가능): {e}")
        
        return {
            "success": True,
            "message": "문서가 성공적으로 삭제되었습니다.",
            "document_id": document_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"문서 삭제 실패: {str(e)}"
        )


class QueryRequest(BaseModel):
    """RAG 쿼리 요청 모델"""
    question: str
    folder_id: Optional[str] = None
    similarity_top_k: int = 3


@router.post("/query")
async def query_documents(
    request: QueryRequest,
    user_id: str = "00000000-0000-0000-0000-000000000001",
    db: Client = Depends(get_db),
):
    """
    특정 폴더의 문서들에서 RAG 쿼리를 수행합니다.
    
    - **question**: 질문 텍스트
    - **folder_id**: 폴더 ID (None이면 루트 폴더)
    - **user_id**: 사용자 ID
    - **similarity_top_k**: 검색할 관련 문서 수 (기본값: 3)
    """
    try:
        question = request.question
        folder_id = request.folder_id
        similarity_top_k = request.similarity_top_k
        
        # 폴더 소유권 확인 (folder_id가 None이면 루트 폴더로 처리)
        if folder_id:
            folder_result = (
                db.table("folders")
                .select("*")
                .eq("id", folder_id)
                .eq("user_id", user_id)
                .is_("deleted_at", "null")
                .execute()
            )
            if not folder_result.data:
                raise HTTPException(
                    status_code=404,
                    detail="폴더를 찾을 수 없습니다."
                )
        
        # document_chunks에서 해당 폴더의 문서 ID를 먼저 찾기
        # 1. 폴더의 문서 ID 목록 가져오기
        query = db.table("documents").select("id").eq("user_id", user_id)
        if folder_id:
            query = query.eq("folder_id", folder_id)
        else:
            query = query.is_("folder_id", "null")
        query = query.is_("deleted_at", "null")
        
        docs_result = query.execute()
        
        print(f"폴더 문서 조회: folder_id={folder_id or 'root'}, 문서 수={len(docs_result.data) if docs_result.data else 0}")
        
        if not docs_result.data or len(docs_result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail="폴더에 문서가 없습니다."
            )
        
        # 2. document_chunks에 실제로 청크가 있는 문서만 필터링
        document_ids_with_chunks = []
        all_doc_ids = [doc.get("id") for doc in docs_result.data]
        
        print(f"청크 확인 시작: {len(all_doc_ids)}개 문서 확인 중...")
        
        # 배치로 청크 확인 (성능 개선)
        chunks_result = (
            db.table("document_chunks")
            .select("document_id")
            .in_("document_id", all_doc_ids)
            .execute()
        )
        
        # 고유한 document_id 추출
        doc_ids_with_chunks_set = set()
        if chunks_result.data:
            for chunk in chunks_result.data:
                doc_id = chunk.get("document_id")
                if doc_id:
                    doc_ids_with_chunks_set.add(doc_id)
        
        document_ids_with_chunks = list(doc_ids_with_chunks_set)
        
        print(f"청크 확인 완료: {len(document_ids_with_chunks)}개 문서에 청크가 있습니다.")
        
        if not document_ids_with_chunks:
            raise HTTPException(
                status_code=404,
                detail="인덱싱된 문서가 없습니다. 먼저 문서를 업로드하고 인덱싱이 완료될 때까지 기다려주세요."
            )
        
        # 실제로 청크가 있는 문서 ID만 사용
        document_ids = document_ids_with_chunks
        active_doc_ids = set(document_ids)
        
        print(f"쿼리 시작: question='{question}', folder_id={folder_id or 'root'}, PDF 수={len(document_ids)}, similarity_top_k={similarity_top_k}")
        print(f"검색할 문서 ID 목록: {document_ids[:5]}...")  # 처음 5개만 출력
        
        # RAG 서비스로 쿼리 수행 (각 PDF 인덱스에서 검색)
        rag_service = get_rag_service()
        try:
            answer = rag_service.query_documents(
                question=question,
                document_ids=document_ids,
                similarity_top_k=similarity_top_k,
            )
            print(f"쿼리 완료: answer 길이={len(answer) if answer else 0}")
            
            # 답변이 비어있으면 에러
            if not answer or not answer.strip():
                raise ValueError("쿼리 결과가 비어있습니다.")
        except ValueError as e:
            error_detail = str(e)
            print(f"쿼리 실패: {error_detail}")
            raise HTTPException(
                status_code=404,
                detail=(
                    f"{error_detail}\n"
                    f"폴더에 {len(document_ids)}개의 인덱싱된 문서가 있지만 검색 결과가 없습니다. "
                    f"질문을 다시 작성하거나 다른 폴더의 문서를 확인해주세요."
                )
            )
        except Exception as e:
            print(f"쿼리 중 예상치 못한 에러: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail=f"쿼리 중 오류가 발생했습니다: {str(e)}"
            )
        
        # 참조된 노드 정보 가져오기 (각 PDF에서 검색)
        nodes = rag_service.get_retrieved_nodes_from_documents(
            question=question,
            document_ids=document_ids,
            similarity_top_k=similarity_top_k * 2,  # 삭제된 문서 필터링을 위해 더 많이 가져오기
        )
        
        print(f"검색된 노드 수: {len(nodes)}, 활성 문서 수: {len(active_doc_ids)}")
        
        # 노드 정보 포맷팅 및 PDF별 그룹화 (삭제된 문서 필터링)
        retrieved_nodes = []
        pdf_sources = {}  # PDF별로 그룹화된 정보
        
        for node in nodes:
            document_id = node.metadata.get('document_id') if hasattr(node, 'metadata') and node.metadata else None
            pdf_name = node.metadata.get('pdf_name') if hasattr(node, 'metadata') and node.metadata else 'Unknown'
            
            # 삭제된 문서의 노드는 제외
            if document_id and document_id not in active_doc_ids:
                print(f"삭제된 문서의 노드 제외: document_id={document_id}")
                continue
            
            # document_id가 없는 노드도 제외 (메타데이터가 없는 경우)
            if not document_id:
                print(f"document_id가 없는 노드 제외")
                continue
            
            node_info = {
                "score": node.score if hasattr(node, 'score') and node.score is not None else None,
                "text": node.text[:500] if hasattr(node, 'text') and node.text else "",
                "full_text": node.text if hasattr(node, 'text') and node.text else "",
                "document_id": document_id,
                "pdf_name": pdf_name,
            }
            retrieved_nodes.append(node_info)
            
            # PDF별로 그룹화 (참고문헌 표시용)
            if document_id:
                if document_id not in pdf_sources:
                    pdf_sources[document_id] = {
                        "document_id": document_id,
                        "pdf_name": pdf_name,
                        "chunks": [],
                        "max_score": node.score if hasattr(node, 'score') and node.score is not None else 0,
                    }
                pdf_sources[document_id]["chunks"].append({
                    "text": node.text[:200] if hasattr(node, 'text') and node.text else "",
                    "score": node.score if hasattr(node, 'score') and node.score is not None else None,
                })
                # 최고 점수 업데이트
                if hasattr(node, 'score') and node.score is not None:
                    if node.score > pdf_sources[document_id]["max_score"]:
                        pdf_sources[document_id]["max_score"] = node.score
        
        # 검색된 노드가 없으면 에러
        if not retrieved_nodes:
            print(f"경고: 검색된 노드가 없습니다.")
            print(f"  - 질문: {question}")
            print(f"  - 폴더 ID: {folder_id or 'root'}")
            print(f"  - 인덱스에서 가져온 노드 수: {len(nodes)}")
            print(f"  - 활성 문서 ID 목록: {list(active_doc_ids)[:5]}...")
            
            # 인덱스에 노드가 있었지만 모두 필터링된 경우
            if len(nodes) > 0:
                filtered_doc_ids = set(
                    node.metadata.get('document_id') 
                    for node in nodes 
                    if hasattr(node, 'metadata') and node.metadata
                )
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"검색 결과가 없습니다. "
                        f"인덱스에서 {len(nodes)}개의 노드를 찾았지만, "
                        f"모두 삭제된 문서에서 온 것으로 보입니다. "
                        f"문서를 다시 업로드하거나 다른 질문을 시도해주세요."
                    )
                )
            else:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        "검색 결과가 없습니다. "
                        "질문을 다시 작성하거나 다른 폴더의 문서를 확인해주세요. "
                        f"현재 폴더에는 {len(docs_result.data)}개의 인덱싱된 문서가 있습니다."
                    )
                )
        
        # PDF 소스 리스트 생성 (점수 순으로 정렬)
        pdf_sources_list = sorted(
            pdf_sources.values(),
            key=lambda x: x["max_score"],
            reverse=True
        )
        
        # similarity_top_k만큼만 반환
        retrieved_nodes = retrieved_nodes[:similarity_top_k]
        
        return {
            "success": True,
            "answer": answer if answer and answer.strip() else "검색 결과를 기반으로 답변을 생성할 수 없습니다.",
            "question": question,
            "folder_id": folder_id,
            "retrieved_nodes": retrieved_nodes,
            "pdf_sources": pdf_sources_list,  # PDF별 그룹화된 참고문헌
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"쿼리 실패: {str(e)}"
        )


@router.get("/status/{document_id}")
async def get_document_status(
    document_id: str,
    user_id: str = "00000000-0000-0000-0000-000000000001",
    db: Client = Depends(get_db),
):
    """
    문서의 인덱싱 상태를 조회합니다.
    
    - **document_id**: 문서 ID (UUID)
    - **user_id**: 사용자 ID (UUID 형식)
    """
    try:
        doc_result = (
            db.table("documents")
            .select("id, status, original_filename, created_at, updated_at")
            .eq("id", document_id)
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .execute()
        )
        
        if not doc_result.data or len(doc_result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail="문서를 찾을 수 없습니다."
            )
        
        document = doc_result.data[0]
        
        return {
            "success": True,
            "document_id": document_id,
            "status": document.get("status", "unknown"),
            "original_filename": document.get("original_filename"),
            "created_at": document.get("created_at"),
            "updated_at": document.get("updated_at"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"상태 조회 실패: {str(e)}"
        )
