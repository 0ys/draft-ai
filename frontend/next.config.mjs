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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;


