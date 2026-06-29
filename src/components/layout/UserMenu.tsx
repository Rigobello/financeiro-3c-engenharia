'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, ChevronDown } from 'lucide-react'

interface UserMenuProps {
  name: string
  grupos: string[]
}

export function UserMenu({ name, grupos }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors w-full"
      >
        <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-white">
            {name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </span>
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-medium text-white truncate">{name}</p>
          <p className="text-xs text-slate-400 truncate">{grupos[0] || 'Usuário'}</p>
        </div>
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">{name}</p>
              <p className="text-xs text-slate-500">{grupos.join(', ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} />
              Sair do sistema
            </button>
          </div>
        </>
      )}
    </div>
  )
}
