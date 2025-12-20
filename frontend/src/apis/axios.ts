import axios from 'axios';

// Next.js는 .env.local 파일을 자동으로 인식합니다.
// 클라이언트 사이드에서 사용하려면 NEXT_PUBLIC_ 접두사가 필요합니다.
const baseURL = process.env.NEXT_PUBLIC_APP_IP || 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': baseURL,
  },
});

export { client };
