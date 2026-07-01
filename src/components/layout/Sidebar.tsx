'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  HardHat,
  Users,
  Wallet,
  CreditCard,
  Building2,
  ChevronRight,
  Settings,
  ClipboardList,
  Clock,
  Package,
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
    <aside className="fixed top-0 left-0 h-full w-60 bg-slate-900 text-white flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-700">
        <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
          <Building2 size={20} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">3C Engenharia</p>
          <p className="text-xs text-slate-400">Controle Financeiro</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight size={14} />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1">{label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User menu */}
      <div className="px-3 py-3 border-t border-slate-700">
        {user ? (
          <UserMenu name={user.name} grupos={user.grupos} />
        ) : (
          <div className="h-10" />
        )}
        <p className="text-xs text-slate-600 text-center mt-2">v1.0.0</p>
      </div>
    </aside>
  )
}
