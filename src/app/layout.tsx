import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { getSession } from '@/lib/auth'

export const metadata: Metadata = {
  title: '3C Engenharia - Controle Financeiro',
  description: 'Sistema de controle financeiro para obras de engenharia civil',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const isLoginPage = false // middleware handles redirect

  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full">
        {session ? (
          <div className="flex h-full">
            <Sidebar user={{ name: session.name, grupos: session.grupos }} />
            <main className="flex-1 ml-60 min-h-screen overflow-auto bg-slate-50">
              {children}
            </main>
          </div>
        ) : (
          <main className="min-h-screen">{children}</main>
        )}
      </body>
    </html>
  )
}
