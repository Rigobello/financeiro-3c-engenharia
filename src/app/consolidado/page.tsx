'use client'

import { useEffect, useState } from 'react'
import {
  Users, Building2, Wallet, Clock, CheckCircle2, AlertCircle,
  Package, TrendingUp, TrendingDown, RefreshCw, FileText
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Consolidado {
  geradoEm: string
  resumo: {
    funcionariosAtivos: number
    obrasAtivas: number
    totalPagamentos: number
    totalAdiantamentos: number
    pontosPagos: number
    pontosAguardandoPagamento: number
    pontosEmAberto: number
    solicitacoesPendentes: number
  }
  obras: {
    id: string; nome: string; cliente: string; orcamento: number
    custos: number; receitas: number; saldo: number; funcionarios: number
  }[]
  materiais: {
    id: string; nome: string; unidade: string
    locais: { nome: string; quantidade: number }[]
  }[]
  solicitacoesPendentes: {
    id: string; funcionario: string; obra: string
    valor: number; motivo: string; criadoEm: string
  }[]
}

export default function ConsolidadoPage() {
  const [data, setData] = useState<Consolidado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    fetch('/api/consolidado')
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Erro ao carregar')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-screen text-red-500">
      <p>{error}</p>
    </div>
  )

  if (!data) return null
  const r = data.resumo

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consolidado Geral</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visão integrada de todas as informações do sistema
            <span className="ml-2 text-slate-400">· Gerado em {new Date(data.geradoEm).toLocaleString('pt-BR')}</span>
          </p>
        </div>
        <Button variant="secondary" onClick={load}>
          <RefreshCw size={14} /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Funcionários Ativos', value: r.funcionariosAtivos, icon: Users, bg: 'bg-blue-500', text: 'text-blue-600', sub: 'cadastrados e ativos' },
          { label: 'Obras em Andamento', value: r.obrasAtivas, icon: Building2, bg: 'bg-orange-500', text: 'text-orange-600', sub: 'obras ativas' },
          { label: 'Total Pago (histórico)', value: formatCurrency(r.totalPagamentos), icon: CheckCircle2, bg: 'bg-green-500', text: 'text-green-600', sub: 'em pagamentos' },
          { label: 'Adiantamentos Aprovados', value: formatCurrency(r.totalAdiantamentos), icon: Wallet, bg: 'bg-purple-500', text: 'text-purple-600', sub: 'aprovados' },
        ].map((k) => (
          <Card key={k.label}>
            <CardBody className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${k.bg} flex-shrink-0`}>
                <k.icon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400">{k.label}</p>
                <p className={`font-bold text-lg ${k.text}`}>{k.value}</p>
                <p className="text-xs text-slate-400">{k.sub}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Ponto & Solicitações status row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Pontos em Aberto', value: r.pontosEmAberto, icon: Clock, color: 'border-slate-200 bg-slate-50 text-slate-700', iconCls: 'text-slate-400' },
          { label: 'Pontos Aguardando Pagamento', value: r.pontosAguardandoPagamento, icon: AlertCircle, color: 'border-yellow-200 bg-yellow-50 text-yellow-700', iconCls: 'text-yellow-500' },
          { label: 'Solicitações Pendentes', value: r.solicitacoesPendentes, icon: FileText, color: 'border-red-200 bg-red-50 text-red-700', iconCls: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-4 ${s.color}`}>
            <s.icon size={28} className={s.iconCls} />
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Obras financeiro */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Building2 size={16} className="text-orange-500" /> Obras — Posição Financeira
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {data.obras.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">Nenhuma obra em andamento</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.obras.map((o) => (
                  <div key={o.id} className="px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{o.nome}</p>
                        <p className="text-xs text-slate-400">{o.cliente} · {o.funcionarios} funcionário(s)</p>
                      </div>
                      <span className={`text-sm font-bold ${o.saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(o.saldo)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                      <div className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-slate-400">Orçamento</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(o.orcamento)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg px-3 py-2">
                        <p className="text-green-500 flex items-center gap-1"><TrendingUp size={10} /> Receitas</p>
                        <p className="font-semibold text-green-700">{formatCurrency(o.receitas)}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg px-3 py-2">
                        <p className="text-red-400 flex items-center gap-1"><TrendingDown size={10} /> Custos</p>
                        <p className="font-semibold text-red-600">{formatCurrency(o.custos)}</p>
                      </div>
                    </div>
                    {/* Budget bar */}
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      {(() => {
                        const pct = o.orcamento > 0 ? Math.min(100, (o.custos / o.orcamento) * 100) : 0
                        return (
                          <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-400' : 'bg-green-400'}`}
                            style={{ width: `${pct}%` }} />
                        )
                      })()}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {o.orcamento > 0 ? ((o.custos / o.orcamento) * 100).toFixed(1) : '0.0'}% do orçamento utilizado
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Materiais por localização */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Package size={16} className="text-teal-500" /> Materiais — Localização Atual
              </h2>
            </CardHeader>
            <CardBody className="p-0">
              {data.materiais.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">Nenhum material cadastrado</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.materiais.map((m) => (
                    <div key={m.id} className="px-5 py-3">
                      <p className="font-medium text-slate-800 text-sm">{m.nome} <span className="text-slate-400 font-normal">({m.unidade})</span></p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {m.locais.length === 0 ? (
                          <span className="text-xs text-slate-400">Sem estoque registrado</span>
                        ) : m.locais.map((l) => (
                          <span key={l.nome} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
                            {l.nome}: {l.quantidade} {m.unidade}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Solicitações pendentes */}
          {data.solicitacoesPendentes.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText size={16} className="text-red-500" /> Adiantamentos Pendentes
                </h2>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                  {data.solicitacoesPendentes.map((s) => (
                    <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{s.funcionario}</p>
                        <p className="text-xs text-slate-400">{s.obra} · {formatDate(s.criadoEm)}</p>
                        {s.motivo && <p className="text-xs text-slate-400 italic truncate max-w-xs">{s.motivo}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-red-500">{formatCurrency(s.valor)}</p>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pendente</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
