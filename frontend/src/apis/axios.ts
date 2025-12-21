import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken } from '@/utils/auth';

// Next.js는 .env.local 파일을 자동으로 인식합니다.
// 클라이언트 사이드에서 사용하려면 NEXT_PUBLIC_ 접두사가 필요합니다.
const baseURL = process.env.NEXT_PUBLIC_APP_IP || 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // CORS 쿠키 전송을 위해
});

// 요청 인터셉터: 모든 요청에 토큰 추가
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 401 에러 시 토큰 제거
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // 인증 실패 시 토큰 제거
      if (typeof window !== 'undefined') {
        localStorage.removeItem('draft_ai_access_token');
        localStorage.removeItem('draft_ai_user');
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { client };
