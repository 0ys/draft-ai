/**
 * 인증 관련 유틸리티 함수
 */

const TOKEN_KEY = 'draft_ai_access_token';
const USER_KEY = 'draft_ai_user';

/**
 * 로컬 스토리지에 액세스 토큰을 저장합니다.
 */
export function setAccessToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * 로컬 스토리지에서 액세스 토큰을 가져옵니다.
 */
export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * 로컬 스토리지에서 액세스 토큰을 제거합니다.
 */
export function removeAccessToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * 로컬 스토리지에 사용자 정보를 저장합니다.
 */
export function setUser(user: {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * 로컬 스토리지에서 사용자 정보를 가져옵니다.
 */
export function getUser(): {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
} | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * 로그인 상태를 확인합니다.
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}
