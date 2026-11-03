import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
})

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'MyOnlineCikgu',
  description: 'Find a verified tutor and learn online.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'MyOnlineCikgu',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A7B83',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} bg-[#F3F5F7] text-[#0F1B2D] antialiased`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <Navbar />
        <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      </body>
    </html>
  )
}