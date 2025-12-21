// API 호출 함수들을 모아두는 디렉토리
// 역할별로 파일을 분리하여 관리합니다.

// 문서 관련 API
export {
  uploadDocumentToBackend,
  getDocumentsFromBackend,
  getFoldersFromBackend,
  deleteDocumentFromBackend,
  getDocumentStatusFromBackend,
  queryDocumentsFromBackend
} from './documents';

