'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Usuário ou senha inválidos'); return }
      router.push('/')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1e2847 0%, #2a3560 50%, #1e3a5f 100%)' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 p-12 text-white">
        <Image src="/Logo3C.png" alt="3C Engenharia" width={200} height={215} className="mb-8 drop-shadow-lg" />
        <h1 className="text-4xl font-bold mb-3">3C Engenharia</h1>
        <p className="text-blue-200/80 text-lg text-center max-w-sm">
          Plataforma de Controle Financeiro e Operacional
        </p>
        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          {[
            { num: 'Obras', desc: 'Gerenciamento completo' },
            { num: 'Equipe', desc: 'Controle de ponto' },
            { num: 'Material', desc: 'Rastreamento em tempo real' },
          ].map((s) => (
            <div key={s.num} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <p className="font-bold text-lg" style={{ color: '#3bbdb8' }}>{s.num}</p>
              <p className="text-xs text-blue-200/70 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8 bg-white/5 backdrop-blur-sm lg:rounded-l-none">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src="/Logo3C.png" alt="3C Engenharia" width={100} height={108} />
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Bem-vindo de volta</h2>
            <p className="text-sm text-slate-400 mb-6">Entre com suas credenciais</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" placeholder="Usuário" value={username}
                  onChange={(e) => setUsername(e.target.value)} required autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50"
                  style={{ '--tw-ring-color': '#5165a8' } as any}
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPwd ? 'text' : 'password'} placeholder="Senha" value={password}
                  onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #5165a8, #3d4d80)' }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>

          <p className="text-center text-white/30 text-xs mt-6">v2.0.0 · 3C Engenharia</p>
        </div>
      </div>
    </div>
  )
}
