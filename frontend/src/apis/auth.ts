import { client } from './axios';

export interface GoogleLoginRequest {
  token: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
  };
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

/**
 * 구글 ID 토큰으로 로그인합니다.
 */
export async function googleLogin(token: string): Promise<TokenResponse> {
  const response = await client.post<TokenResponse>('/api/auth/google', {
    token,
  });
  return response.data;
}

/**
 * 현재 로그인한 사용자 정보를 조회합니다.
 */
export async function getCurrentUser(): Promise<UserResponse> {
  const response = await client.get<UserResponse>('/api/auth/me');
  return response.data;
}
