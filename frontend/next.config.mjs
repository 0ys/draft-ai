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
  // COOP 헤더를 제거하여 Google GSI와의 호환성 확보
  // (COOP 헤더가 Google GSI의 postMessage를 차단할 수 있음)
  // async headers() {
  //   return [
  //     {
  //       source: '/:path*',
  //       headers: [
  //         {
  //           key: 'Cross-Origin-Opener-Policy',
  //           value: 'unsafe-none',
  //         },
  //       ],
  //     },
  //   ];
  // },
};

export default nextConfig;


