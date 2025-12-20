// 문서 관련 API 호출 함수

import { client } from './axios';

/**
 * 문서 파일을 백엔드에 업로드합니다.
 */
export async function uploadDocumentToBackend(
  file: File,
  folderId?: string,  // UUID 형식
  userId: string = '00000000-0000-0000-0000-000000000001'  // UUID 형식
): Promise<{ success: boolean; filename?: string; size?: number; documentId?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId);
    }

    const response = await client.post('/api/documents/upload', formData, {
      params: { user_id: userId },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      success: true,
      filename: response.data.filename,
      size: response.data.size,
      documentId: response.data.document_id,
    };
  } catch (error: any) {
    console.error('❌ 파일 업로드 실패:', error);
    const errorMessage = error.response?.data?.detail || error.message || '알 수 없는 오류가 발생했습니다.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 문서 목록을 조회합니다.
 */
export async function getDocumentsFromBackend(
  userId: string = '00000000-0000-0000-0000-000000000001',  // UUID 형식
  folderId?: string  // UUID 형식
): Promise<{ success: boolean; documents?: any[]; error?: string }> {
  try {
    const params: { user_id: string; folder_id?: string } = { user_id: userId };
    if (folderId) {
      params.folder_id = folderId;
    }

    const response = await client.get('/api/documents/list', { params });

    return {
      success: true,
      documents: response.data.documents || [],
    };
  } catch (error: any) {
    console.error('❌ 문서 목록 조회 실패:', error);
    const errorMessage = error.response?.data?.detail || error.message || '알 수 없는 오류가 발생했습니다.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 폴더 목록을 조회합니다.
 */
export async function getFoldersFromBackend(
  userId: string = '00000000-0000-0000-0000-000000000001'  // UUID 형식
): Promise<{ success: boolean; folders?: any[]; error?: string }> {
  try {
    const response = await client.get('/api/documents/folders', {
      params: { user_id: userId },
    });

    return {
      success: true,
      folders: response.data.folders || [],
    };
  } catch (error: any) {
    console.error('❌ 폴더 목록 조회 실패:', error);
    const errorMessage = error.response?.data?.detail || error.message || '알 수 없는 오류가 발생했습니다.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
