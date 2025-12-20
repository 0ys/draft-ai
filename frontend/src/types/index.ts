// TypeScript 타입 정의

export type QAChunk = {
  id: string;
  question: string;
  answer: string;
  source: {
    fileName: string;
    page?: number;
    folderPath: string;
  };
};

export type DraftResult = {
  draft: string;
  evidences: QAChunk[];
};

export type Document = {
  id: string;
  fileName: string;
  folderPath: string;
  status: 'processing' | 'completed' | 'error';
  uploadedAt: Date;
  // qaChunks는 RAG 파이프라인 구현 시 추가 예정
};

export type Folder = {
  path: string;
  name: string;
  documents: Document[];
};
