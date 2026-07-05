'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, HardHat, Users, Wallet, CreditCard,
  ClipboardList, Clock, Package, Settings, ChevronRight,
  BarChart3, Activity,
} from 'lucide-react'
import { UserMenu } from './UserMenu'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/obras', label: 'Obras', icon: HardHat },
  { href: '/funcionarios', label: 'Funcionários', icon: Users },
  { href: '/caixa', label: 'Caixa', icon: Wallet },
  { href: '/pagamentos', label: 'Pagamentos', icon: CreditCard },
  { href: '/solicitacoes', label: 'Adiantamentos', icon: ClipboardList },
  { href: '/ponto', label: 'Registro de Ponto', icon: Clock, grupos: ['Ponto', 'Administrador'] },
  { href: '/materiais', label: 'Materiais', icon: Package, grupos: ['Almoxarifado', 'Administrador'] },
  { href: '/controle-atividades', label: 'Controle de Atividades', icon: Activity, grupos: ['Administrador', 'Engenheiro'] },
  { href: '/consolidado', label: 'Consolidado Geral', icon: BarChart3, grupos: ['Administrador', 'Engenheiro'] },
]

const adminItems = [
  { href: '/admin/usuarios', label: 'Usuários', icon: Settings },
]

interface SidebarProps {
  user: { name: string; grupos: string[] } | null
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = user?.grupos.includes('Administrador') ?? false

  const visibleNavItems = navItems.filter((item) => {
    if (!item.grupos) return true
    return item.grupos.some((g) => user?.grupos.includes(g))
  })

  return (
    <aside className="fixed top-0 left-0 h-full w-60 flex flex-col z-50"
      style={{ background: 'linear-gradient(180deg, #2a3560 0%, #1e2847 100%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow">
          <Image src="/Logo3C.png" alt="3C" width={32} height={32} className="object-contain" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight text-white">3C Engenharia</p>
          <p className="text-xs text-blue-200/70">Controle Financeiro</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={17} className={isActive ? 'text-teal-400' : 'text-blue-200/50 group-hover:text-teal-300'} />
              <span className="flex-1 text-sm">{label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-blue-200/40 uppercase tracking-wider">Admin</p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-teal-400' : 'text-blue-200/50'} />
                  <span className="flex-1">{label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User menu */}
      <div className="px-3 py-3 border-t border-white/10">
        {user ? (
          <UserMenu name={user.name} grupos={user.grupos} />
        ) : (
          <div className="h-10" />
        )}
        <p className="text-xs text-blue-200/30 text-center mt-2">v2.0.0 · 3C Engenharia</p>
      </div>
    </aside>
  )
}
