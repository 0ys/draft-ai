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
  embedding?: number[]; // 벡터 임베딩 (실제로는 서버에서 관리)
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
  qaChunks: QAChunk[];
};

export type Folder = {
  path: string;
  name: string;
  documents: Document[];
};
