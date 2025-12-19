'use server';

import { QAChunk, Document, Folder, DraftResult } from '@/types';
import { parseQAPairs, calculateSimilarity } from '@/utils';

// In-memory 데이터 저장소 (실제로는 DB 사용)
let documents: Document[] = [];
let folders: Map<string, Folder> = new Map();

/**
 * 문서 업로드 및 파싱
 */
export async function uploadDocument(
  file: File,
  folderPath: string
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    // 파일을 텍스트로 읽기
    // 실제로는 PDF/DOCX 파서가 필요하지만, MVP에서는 텍스트 파일로 가정
    // PDF/DOCX의 경우 실제 파서 라이브러리 사용 필요 (예: pdf-parse, mammoth)
    let text: string;
    try {
      text = await file.text();
    } catch (error) {
      // 바이너리 파일의 경우 시뮬레이션 데이터 사용 (MVP)
      text = `Q: ${file.name}에 대한 질문입니다.\n답변: ${file.name}에 대한 답변 내용입니다.\n\nQ: 추가 질문입니다.\n답변: 추가 답변 내용입니다.`;
    }
    
    // Q&A 쌍으로 파싱
    const qaPairs = parseQAPairs(text, file.name, folderPath);
    
    // QAChunk 생성
    const qaChunks: QAChunk[] = qaPairs.map((qa, index) => ({
      id: `${Date.now()}-${index}`,
      question: qa.question,
      answer: qa.answer,
      source: {
        fileName: file.name,
        page: qa.page,
        folderPath,
      },
    }));

    // Document 생성
    const document: Document = {
      id: `doc-${Date.now()}`,
      fileName: file.name,
      folderPath,
      status: 'completed',
      uploadedAt: new Date(),
      qaChunks,
    };

    documents.push(document);

    // Folder 업데이트
    if (!folders.has(folderPath)) {
      folders.set(folderPath, {
        path: folderPath,
        name: folderPath.split('/').pop() || folderPath,
        documents: [],
      });
    }
    folders.get(folderPath)!.documents.push(document);

    return { success: true, documentId: document.id };
  } catch (error) {
    console.error('문서 업로드 실패:', error);
    return { success: false, error: '문서 업로드에 실패했습니다.' };
  }
}

/**
 * 폴더 목록 조회
 */
export async function getFolders(): Promise<Folder[]> {
  return Array.from(folders.values());
}

/**
 * 문서 목록 조회
 */
export async function getDocuments(): Promise<Document[]> {
  return documents;
}

/**
 * RAG 기반 초안 생성
 */
export async function generateDraft(
  question: string,
  folderPath: string | null
): Promise<DraftResult> {
  // 1. 검색 대상 QAChunk 필터링
  let candidateChunks: QAChunk[] = [];
  
  if (folderPath) {
    // 특정 폴더의 문서들만 검색
    const folder = folders.get(folderPath);
    if (folder) {
      candidateChunks = folder.documents.flatMap(doc => doc.qaChunks);
    }
  } else {
    // 전체 문서 검색
    candidateChunks = documents.flatMap(doc => doc.qaChunks);
  }

  // 2. 질문 기준으로 유사도 계산 및 정렬
  const scoredChunks = candidateChunks.map(chunk => ({
    chunk,
    score: calculateSimilarity(question, chunk.question),
  }));

  // 상위 N개 선택 (N=5)
  const topChunks = scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.chunk);

  // 3. 초안 생성 (실제로는 LLM API 호출)
  const draft = generateDraftFromChunks(question, topChunks);

  return {
    draft,
    evidences: topChunks,
  };
}

/**
 * QAChunk들을 기반으로 초안 생성
 * 실제로는 LLM API를 호출하지만, MVP에서는 템플릿 기반 생성
 */
function generateDraftFromChunks(question: string, chunks: QAChunk[]): string {
  if (chunks.length === 0) {
    return '관련된 기존 Q&A를 찾을 수 없습니다.';
  }

  let draft = `[질문]\n${question}\n\n`;
  draft += `[초안]\n\n`;
  draft += `기존 민원 Q&A 자료를 검토한 결과, 다음과 같이 답변드립니다:\n\n`;

  chunks.forEach((chunk, index) => {
    draft += `${index + 1}. ${chunk.answer}\n\n`;
  });

  draft += `\n[참고사항]\n`;
  draft += `- 위 답변은 기존 민원 Q&A 자료를 기반으로 작성되었습니다.\n`;
  draft += `- 구체적인 사항은 관련 부서에 문의하시기 바랍니다.\n`;

  return draft;
}

