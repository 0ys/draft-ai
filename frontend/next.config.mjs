/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server Actions 요청 크기 제한 증가 (50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // 구글 OAuth를 위한 헤더 설정
  // COOP 정책을 제거하거나 완화하여 Google GSI와의 호환성 확보
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'unsafe-none', // Google GSI와의 호환성을 위해 변경
          },
        ],
      },
    ];
  },
};

export default nextConfig;


