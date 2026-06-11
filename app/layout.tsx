import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 营养记录',
  description: 'AI 初筛、权威库校准、自己确认、自动复盘的移动端营养记录 App',
  manifest: '/manifest.webmanifest',
  applicationName: '营养记录',
  appleWebApp: {
    capable: true,
    title: '营养记录',
    statusBarStyle: 'default'
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f7faf7'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
