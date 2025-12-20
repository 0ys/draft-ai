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
    folder_path: Optional[str] = None,
    user_id: int = 1,  # 우선 하드코딩, 나중에 인증에서 가져올 예정
    db: Client = Depends(get_db),
):
    """
    문서 파일을 업로드합니다.
    
    - **file**: 업로드할 파일 (PDF, DOCX, DOC)
    - **folder_path**: 문서를 저장할 폴더 경로 (선택사항)
    - **user_id**: 사용자 ID (우선 하드코딩)
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
    
    # 폴더 경로에 따라 하위 디렉토리 생성
    target_folder_path = folder_path or "root/2025"
    folder_path_parts = target_folder_path.split("/")
    save_dir = UPLOAD_DIR / "/".join(folder_path_parts)
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
            "folder_path": target_folder_path,
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
        "folder_path": target_folder_path,
        "file_path": relative_path,
        "absolute_path": absolute_path,
        "message": "파일이 성공적으로 업로드되었습니다.",
    }


@router.get("/list")
async def list_documents(
    user_id: int = 1,  # 우선 하드코딩, 나중에 인증에서 가져올 예정
    folder_path: Optional[str] = None,
    db: Client = Depends(get_db),
):
    """
    사용자의 문서 목록을 조회합니다.
    
    - **user_id**: 사용자 ID
    - **folder_path**: 특정 폴더 경로로 필터링 (선택사항)
    """
    try:
        query = db.table("documents").select("*").eq("user_id", user_id)
        
        # 폴더 경로 필터링
        if folder_path:
            query = query.eq("folder_path", folder_path)
        
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
    user_id: int = 1,  # 우선 하드코딩, 나중에 인증에서 가져올 예정
    db: Client = Depends(get_db),
):
    """
    사용자의 폴더 목록을 조회합니다.
    
    - **user_id**: 사용자 ID
    """
    try:
        # 사용자의 모든 문서에서 고유한 folder_path 추출
        result = db.table("documents").select("folder_path").eq("user_id", user_id).execute()
        
        # 중복 제거
        folders = list(set([doc["folder_path"] for doc in result.data if doc.get("folder_path")]))
        
        # 폴더별 문서 개수 계산
        folder_list = []
        for folder_path in folders:
            count_result = (
                db.table("documents")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .eq("folder_path", folder_path)
                .execute()
            )
            folder_list.append({
                "path": folder_path,
                "name": folder_path.split("/")[-1] if "/" in folder_path else folder_path,
                "document_count": count_result.count if hasattr(count_result, "count") else len(count_result.data),
            })
        
        # 경로 기준 정렬
        folder_list.sort(key=lambda x: x["path"])
        
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
