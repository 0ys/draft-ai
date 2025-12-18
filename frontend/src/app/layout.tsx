import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "draft-ai frontend",
  description: "Next.js + TypeScript + Tailwind app for draft-ai"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}


