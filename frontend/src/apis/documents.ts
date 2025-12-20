// 문서 관련 API 호출 함수

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

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

    const url = `${API_BASE_URL}/api/documents/upload?user_id=${userId}`;
    console.log('🌐 API 요청:', { method: 'POST', url, userId, folderId, fileName: file.name, fileSize: file.size });

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    console.log('🌐 API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '업로드 실패' }));
      console.error('❌ API 에러 응답:', errorData);
      throw new Error(errorData.detail || '파일 업로드에 실패했습니다.');
    }

    const data = await response.json();
    console.log('🌐 API 응답 데이터:', data);
    return {
      success: true,
      filename: data.filename,
      size: data.size,
      documentId: data.document_id,
    };
  } catch (error) {
    console.error('❌ 파일 업로드 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
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
    let url = `${API_BASE_URL}/api/documents/list?user_id=${userId}`;
    if (folderId) {
      url += `&folder_id=${encodeURIComponent(folderId)}`;
    }

    console.log('🌐 API 요청:', { method: 'GET', url, userId, folderId });
    const response = await fetch(url);
    console.log('🌐 API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '조회 실패' }));
      console.error('❌ API 에러 응답:', errorData);
      throw new Error(errorData.detail || '문서 목록 조회에 실패했습니다.');
    }

    const data = await response.json();
    console.log('🌐 API 응답 데이터:', data);
    return {
      success: true,
      documents: data.documents || [],
    };
  } catch (error) {
    console.error('❌ 문서 목록 조회 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
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
    const url = `${API_BASE_URL}/api/documents/folders?user_id=${userId}`;
    console.log('🌐 API 요청:', { method: 'GET', url, userId });
    
    const response = await fetch(url);
    console.log('🌐 API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '조회 실패' }));
      console.error('❌ API 에러 응답:', errorData);
      throw new Error(errorData.detail || '폴더 목록 조회에 실패했습니다.');
    }

    const data = await response.json();
    console.log('🌐 API 응답 데이터:', data);
    return {
      success: true,
      folders: data.folders || [],
    };
  } catch (error) {
    console.error('❌ 폴더 목록 조회 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}
