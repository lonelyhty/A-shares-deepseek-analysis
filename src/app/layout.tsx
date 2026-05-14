import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QFactor A股量化驾驶舱",
  description: "多用户 A股量化分析、信号评分、DeepSeek 研究报告和自选股工作台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
