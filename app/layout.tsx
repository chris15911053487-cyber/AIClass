import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'AI 实践学堂 · 从理解到创造',
  description:
    '从零学习 AI，在真实任务中掌握办公、内容创作、Skills 与 AI 编程。',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
