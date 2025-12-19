'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 메인 페이지 접속 시 로그인 페이지로 리다이렉트
    router.push('/login');
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <p className="text-slate-400">리다이렉트 중...</p>
      </div>
    </main>
  );
}
