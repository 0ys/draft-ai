// 유틸리티 함수

/**
 * 폴더 경로에서 폴더 이름 추출
 */
export function getFolderName(path: string): string {
  const parts = path.split('/').filter(p => p);
  return parts[parts.length - 1] || 'root';
}
