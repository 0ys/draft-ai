// 유틸리티 함수

/**
 * 간단한 텍스트 유사도 계산 (코사인 유사도 대신 간단한 키워드 매칭)
 * MVP에서는 실제 벡터 DB 대신 키워드 기반 검색 사용
 */
export function calculateSimilarity(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textLower = text.toLowerCase();
  let matches = 0;
  
  queryWords.forEach(word => {
    if (textLower.includes(word)) {
      matches++;
    }
  });
  
  return matches / queryWords.length;
}

/**
 * 문서 텍스트를 Q&A 쌍으로 파싱
 * 실제로는 더 정교한 파싱이 필요하지만, MVP에서는 간단한 패턴 매칭 사용
 */
export function parseQAPairs(text: string, fileName: string, folderPath: string): Array<{
  question: string;
  answer: string;
  page?: number;
}> {
  const qaPairs: Array<{ question: string; answer: string; page?: number }> = [];
  
  // 패턴: "Q:", "질문:", "?" 로 시작하는 줄을 질문으로 간주
  // 그 다음 줄부터 다음 질문 전까지를 답변으로 간주
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentQuestion = '';
  let currentAnswer: string[] = [];
  let pageNumber: number | undefined;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 페이지 번호 추출 (예: "Page 1", "p.1" 등)
    const pageMatch = line.match(/(?:page|p\.?)\s*(\d+)/i);
    if (pageMatch) {
      pageNumber = parseInt(pageMatch[1], 10);
    }
    
    // 질문 패턴 감지
    if (line.match(/^(Q:|질문:|.*\?$)/i)) {
      // 이전 Q&A 쌍 저장
      if (currentQuestion && currentAnswer.length > 0) {
        qaPairs.push({
          question: currentQuestion,
          answer: currentAnswer.join('\n'),
          page: pageNumber,
        });
      }
      
      // 새 질문 시작
      currentQuestion = line.replace(/^(Q:|질문:)\s*/i, '').trim();
      currentAnswer = [];
    } else if (currentQuestion) {
      // 답변에 추가
      currentAnswer.push(line);
    }
  }
  
  // 마지막 Q&A 쌍 저장
  if (currentQuestion && currentAnswer.length > 0) {
    qaPairs.push({
      question: currentQuestion,
      answer: currentAnswer.join('\n'),
      page: pageNumber,
    });
  }
  
  // Q&A 쌍이 없으면 전체 텍스트를 하나의 답변으로 처리
  if (qaPairs.length === 0 && text.trim()) {
    qaPairs.push({
      question: '일반 정보',
      answer: text,
    });
  }
  
  return qaPairs;
}

/**
 * 폴더 경로에서 폴더 이름 추출
 */
export function getFolderName(path: string): string {
  const parts = path.split('/').filter(p => p);
  return parts[parts.length - 1] || 'root';
}
