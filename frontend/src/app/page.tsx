export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 px-4">
      <div className="max-w-xl w-full">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-50">
          draft-ai <span className="text-sky-400">Frontend</span>
        </h1>
        <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
          Next.js + TypeScript + Tailwind CSS 환경이 준비되었습니다.
          <br />
          `src/app/page.tsx`와 `src/app/layout.tsx`를 수정해 화면을 구성해 보세요.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200">
            Next.js (App Router)
          </span>
          <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200">
            TypeScript
          </span>
          <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200">
            Tailwind CSS
          </span>
        </div>
      </div>
    </main>
  );
}


