import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://47.108.221.191:8442'),
  title: 'Litera · 每日文献工作台',
  description: '记录、整理并回溯每天阅读的学术文献。',
  openGraph: {
    title: 'Litera · 每日文献工作台',
    description: '记录、整理并按日期统计每天阅读的学术文献。',
    type: 'website',
    url: 'https://47.108.221.191:8442',
    siteName: 'Litera',
    images: [{
      url: 'https://47.108.221.191:8442/og.png',
      width: 1672,
      height: 941,
      alt: 'Litera 每日文献工作台',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Litera · 每日文献工作台',
    description: '记录、整理并按日期统计每天阅读的学术文献。',
    images: ['https://47.108.221.191:8442/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
