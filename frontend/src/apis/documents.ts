// 문서 관련 API 호출 함수

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * 문서 파일을 백엔드에 업로드합니다.
 */
export async function uploadDocumentToBackend(
  file: File,
  folderPath?: string,
  userId: number = 1
): Promise<{ success: boolean; filename?: string; size?: number; documentId?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (folderPath) {
      formData.append('folder_path', folderPath);
    }

    const response = await fetch(`${API_BASE_URL}/api/documents/upload?user_id=${userId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '업로드 실패' }));
      throw new Error(errorData.detail || '파일 업로드에 실패했습니다.');
    }

    const data = await response.json();
    return {
      success: true,
      filename: data.filename,
      size: data.size,
      documentId: data.document_id,
    };
  } catch (error) {
    console.error('파일 업로드 실패:', error);
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
  userId: number = 1,
  folderPath?: string
): Promise<{ success: boolean; documents?: any[]; error?: string }> {
  try {
    let url = `${API_BASE_URL}/api/documents/list?user_id=${userId}`;
    if (folderPath) {
      url += `&folder_path=${encodeURIComponent(folderPath)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '조회 실패' }));
      throw new Error(errorData.detail || '문서 목록 조회에 실패했습니다.');
    }

    const data = await response.json();
    return {
      success: true,
      documents: data.documents || [],
    };
  } catch (error) {
    console.error('문서 목록 조회 실패:', error);
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
  userId: number = 1
): Promise<{ success: boolean; folders?: any[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/folders?user_id=${userId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '조회 실패' }));
      throw new Error(errorData.detail || '폴더 목록 조회에 실패했습니다.');
    }

    const data = await response.json();
    return {
      success: true,
      folders: data.folders || [],
    };
  } catch (error) {
    console.error('폴더 목록 조회 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}
