from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Optional, List
from pathlib import Path
from datetime import datetime
import uuid

from app.core.database import get_db
from supabase import Client

router = APIRouter()

# 업로드된 파일을 저장할 디렉토리
UPLOAD_DIR = Path("storage")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_document(
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
