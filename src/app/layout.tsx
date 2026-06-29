import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: '3C Engenharia - Controle Financeiro',
  description: 'Sistema de controle financeiro para obras de engenharia civil',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full">
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 ml-60 min-h-screen overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
