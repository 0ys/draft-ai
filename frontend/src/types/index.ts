// TypeScript 타입 정의

export type QAChunk = {
  id: string;
  question: string;
  answer: string;
  source: {
    fileName: string;
    page?: number;
    folderId: string | null;  // UUID 형식
  };
};

export type DraftResult = {
  draft: string;
  evidences: QAChunk[];
};

export type Document = {
  id: string;
  fileName: string;
  folderId: string | null;  // UUID 형식, NULL 가능
  status: 'processing' | 'completed' | 'error';
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
