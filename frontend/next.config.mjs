/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server Actions 요청 크기 제한 증가 (50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Google GSI와의 호환성을 위해 COOP 헤더를 명시적으로 제거하지 않음
  // (Next.js 기본 설정 사용)
};

export default nextConfig;


