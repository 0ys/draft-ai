'use server';

import { Document, Folder, DraftResult } from '@/types';
import { 
  uploadDocumentToBackend, 
  getDocumentsFromBackend, 
  getFoldersFromBackend,
  deleteDocumentFromBackend,
  getDocumentStatusFromBackend,
  queryDocumentsFromBackend
} from '@/apis';

// 우선 하드코딩, 나중에 인증에서 가져올 예정
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * 문서 업로드 및 파싱
 * 백엔드 API를 통해 파일을 업로드합니다.
 */
export async function uploadDocument(
  file: File,
  folderId: string | null  // UUID 형식, NULL 가능
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    // 루트 폴더 ID인 경우 folderId를 undefined로 처리 (folder_id가 NULL로 저장됨)
    const ROOT_FOLDER_ID = '00000000-0000-0000-0000-000000000000';
    const actualFolderId = folderId === ROOT_FOLDER_ID ? undefined : (folderId || undefined);
    
    // 백엔드로 파일 업로드
    const uploadResult = await uploadDocumentToBackend(file, actualFolderId, DEFAULT_USER_ID);
    
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
      console.error('❌ 폴더 목록 조회 실패:', result.error);
      return [];
    }

    // 백엔드 응답을 Frontend Folder 타입으로 변환
    const folders = (result.folders || []).map((folder: any) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parent_id || null,
      documentCount: folder.document_count || 0,
      documents: [], // 문서는 별도로 조회
    }));
    return folders;
  } catch (error) {
    console.error('❌ 폴더 목록 조회 실패:', error);
    return [];
  }
}

/**
 * 문서 목록 조회
 * 백엔드 API에서 문서 목록을 가져옵니다.
 */
export async function getDocuments(folderId?: string): Promise<Document[]> {
  try {
    // 루트 폴더 ID인 경우 folderId를 undefined로 처리 (folder_id가 NULL인 문서 조회)
    const ROOT_FOLDER_ID = '00000000-0000-0000-0000-000000000000';
    const actualFolderId = folderId === ROOT_FOLDER_ID ? undefined : folderId;
    
    const result = await getDocumentsFromBackend(DEFAULT_USER_ID, actualFolderId);
    
    if (!result.success) {
      console.error('❌ 문서 목록 조회 실패:', result.error);
      return [];
    }

    // 백엔드 응답을 Frontend Document 타입으로 변환
    const documents = (result.documents || []).map((doc: any) => ({
      id: doc.id,
      fileName: doc.original_filename,
      folderId: doc.folder_id || null,
      status: (doc.status === 'completed' ? 'completed' : (doc.status === 'failed' ? 'failed' : 'processing')) as 'processing' | 'completed' | 'failed',
      uploadedAt: new Date(doc.created_at),
    }));
    return documents;
  } catch (error) {
    console.error('❌ 문서 목록 조회 실패:', error);
    return [];
  }
}

/**
 * 문서 삭제
 * 백엔드 API를 통해 문서를 삭제합니다 (소프트 딜리트).
 */
export async function deleteDocument(
  documentId: string  // UUID 형식
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await deleteDocumentFromBackend(documentId, DEFAULT_USER_ID);
    
    if (!result.success) {
      return { 
        success: false, 
        error: result.error || '문서 삭제에 실패했습니다.' 
      };
    }

    return { 
      success: true
    };
  } catch (error) {
    console.error('문서 삭제 실패:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '문서 삭제에 실패했습니다.' 
    };
  }
}

/**
 * 문서의 인덱싱 상태를 조회합니다.
 */
export async function getDocumentStatus(
  documentId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const result = await getDocumentStatusFromBackend(documentId, DEFAULT_USER_ID);
    return result;
  } catch (error) {
    console.error('문서 상태 조회 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '문서 상태 조회에 실패했습니다.',
    };
  }
}

/**
 * RAG 기반 초안 생성
 * 폴더별로 인덱싱된 PDF 문서들에서 질문에 대한 답변을 생성합니다.
 * 하나의 폴더에는 여러 PDF가 포함될 수 있으며, 각 PDF의 정보는 노드 메타데이터로 추적됩니다.
 */
export async function generateDraft(
  question: string,
  folderId: string | null  // UUID 형식
): Promise<DraftResult> {
  try {
    // 루트 폴더 ID인 경우 folderId를 undefined로 처리
    const ROOT_FOLDER_ID = '00000000-0000-0000-0000-000000000000';
    const actualFolderId = folderId === ROOT_FOLDER_ID ? null : folderId;
    
    const result = await queryDocumentsFromBackend(
      question,
      actualFolderId || null,
      DEFAULT_USER_ID,
      3
    );
    
    if (!result.success) {
      const errorMsg = result.error || '쿼리 실패';
      console.error('쿼리 실패:', errorMsg);
      throw new Error(errorMsg);
    }
    
    // 응답 검증
    if (!result.answer || !result.answer.trim()) {
      console.warn('쿼리 응답이 비어있습니다:', result);
      throw new Error('검색 결과를 기반으로 답변을 생성할 수 없습니다.');
    }
    
    if (!result.retrievedNodes || result.retrievedNodes.length === 0) {
      console.warn('검색된 노드가 없습니다:', result);
      throw new Error('검색 결과가 없습니다. 질문을 다시 작성해주세요.');
    }
    
    // QAChunk 형식으로 변환 (각 노드를 개별 evidence로)
    const evidences = (result.retrievedNodes || []).map((node: any, index: number) => ({
      id: `chunk-${index}`,
      question: question,
      answer: node.full_text || node.text || '',
      source: {
        fileName: node.pdf_name || 'Unknown',
        documentId: node.document_id || undefined,
        page: undefined,
        folderId: folderId,
      },
      score: node.score || undefined,
    }));
    
    return {
      draft: result.answer,
      evidences,
      pdfSources: result.pdfSources || [],  // PDF별 그룹화된 참고문헌 정보
    };
  } catch (error) {
    console.error('초안 생성 실패:', error);
    return {
      draft: `[질문]\n${question}\n\n[오류]\n\n초안 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      evidences: [],
    };
  }
}

