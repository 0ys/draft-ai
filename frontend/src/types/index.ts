// TypeScript 타입 정의

export type QAChunk = {
  id: string;
  question: string;
  answer: string;
  source: {
    fileName: string;
    documentId?: string;  // 문서 ID (UUID)
    page?: number;
    folderId: string | null;  // UUID 형식
  };
  score?: number;  // 유사도 점수
};

export type PDFSource = {
  document_id: string;  // 문서 ID (UUID)
  pdf_name: string;  // PDF 파일명
  chunks: Array<{
    text: string;
    score: number | null;
  }>;
  max_score: number;  // 최고 유사도 점수
};

export type DraftResult = {
  draft: string;
  evidences: QAChunk[];
  pdfSources?: PDFSource[];  // PDF별 그룹화된 참고문헌
};

export type Document = {
  id: string;
  fileName: string;
  folderId: string | null;  // UUID 형식, NULL 가능
  status: 'processing' | 'completed' | 'failed';  // 'error' -> 'failed'로 변경
  uploadedAt: Date;
  // qaChunks는 RAG 파이프라인 구현 시 추가 예정
};

export type Folder = {
  id: string;  // UUID 형식
  name: string;
  parentId: string | null;  // UUID 형식, NULL이면 루트 폴더
  documentCount: number;
  documents: Document[];  // 클라이언트에서 필요시 로드
};
