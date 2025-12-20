'use server';

import { Document, Folder, DraftResult } from '@/types';
import { 
  uploadDocumentToBackend, 
  getDocumentsFromBackend, 
  getFoldersFromBackend 
} from '@/apis';

// 우선 하드코딩, 나중에 인증에서 가져올 예정
const DEFAULT_USER_ID = 1;

/**
 * 문서 업로드 및 파싱
 * 백엔드 API를 통해 파일을 업로드합니다.
 */
export async function uploadDocument(
  file: File,
  folderPath: string
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    // 백엔드로 파일 업로드
    const uploadResult = await uploadDocumentToBackend(file, folderPath, DEFAULT_USER_ID);
    
    if (!uploadResult.success) {
      return { 
        success: false, 
        error: uploadResult.error || '파일 업로드에 실패했습니다.' 
      };
    }

    return { 
      success: true, 
      documentId: uploadResult.documentId 
    };
  } catch (error) {
    console.error('문서 업로드 실패:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '문서 업로드에 실패했습니다.' 
    };
  }
}

/**
 * 폴더 목록 조회
 * 백엔드 API에서 폴더 목록을 가져옵니다.
 */
export async function getFolders(): Promise<Folder[]> {
  try {
    const result = await getFoldersFromBackend(DEFAULT_USER_ID);
    
    if (!result.success) {
      console.error('폴더 목록 조회 실패:', result.error);
      return [];
    }

    // 백엔드 응답을 Frontend Folder 타입으로 변환
    return (result.folders || []).map((folder: any) => ({
      path: folder.path,
      name: folder.name,
      documents: [], // 문서는 별도로 조회
    }));
  } catch (error) {
    console.error('폴더 목록 조회 실패:', error);
    return [];
  }
}

/**
 * 문서 목록 조회
 * 백엔드 API에서 문서 목록을 가져옵니다.
 */
export async function getDocuments(folderPath?: string): Promise<Document[]> {
  try {
    const result = await getDocumentsFromBackend(DEFAULT_USER_ID, folderPath);
    
    if (!result.success) {
      console.error('문서 목록 조회 실패:', result.error);
      return [];
    }

    // 백엔드 응답을 Frontend Document 타입으로 변환
    return (result.documents || []).map((doc: any) => ({
      id: doc.id,
      fileName: doc.original_filename,
      folderPath: doc.folder_path,
      status: doc.status === 'completed' ? 'completed' : 'processing',
      uploadedAt: new Date(doc.created_at),
    }));
  } catch (error) {
    console.error('문서 목록 조회 실패:', error);
    return [];
  }
}

/**
 * RAG 기반 초안 생성
 * TODO: 실제 RAG 파이프라인 구현 필요 (백엔드 API 호출)
 */
export async function generateDraft(
  question: string,
  folderPath: string | null
): Promise<DraftResult> {
  // TODO: 백엔드 RAG API 호출로 대체 예정
  return {
    draft: `[질문]\n${question}\n\n[초안]\n\nRAG 파이프라인이 구현되면 여기에 초안이 생성됩니다.`,
    evidences: [],
  };
}

