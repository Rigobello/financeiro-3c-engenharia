'use client'

import { useEffect, useState, useCallback } from 'react'
import { Printer, RefreshCw, Calendar, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Atividade {
  id: string
  nome: string
  descricao: string | null
  peso: number
  unidade: string | null
  registroAtualId: string | null
  percentualAcumuladoAnterior: number
  percentualPlanejadoSemana: number
  percentualExecutadoSemana: number
  percentualAcumuladoAtual: number
  observacao: string | null
}

interface ObraRelatorio {
  obra: { id: string; nome: string; cliente: string; cidade: string | null }
  semana: string
  periodoInicio: string
  periodoFim: string
  atividades: Atividade[]
  evolucaoPonderada: number
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getPreviousWeeks(current: string, count: number): string[] {
  const [year, wStr] = current.split('-W')
  let y = Number(year); let w = Number(wStr)
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    w--; if (w < 1) { y--; w = 52 }
    result.push(`${y}-W${String(w).padStart(2, '0')}`)
  }
  return result
}

const fmt = (v: number) => `${v.toFixed(1)}%`

const pesoBadge = (p: number) =>
  p === 3 ? 'bg-orange-100 text-orange-700' : p === 2 ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'

export default function ControleAtividadesPage() {
  const currentWeek = getISOWeek(new Date())
  const [semana, setSemana] = useState(currentWeek)
  const [relatorio, setRelatorio] = useState<ObraRelatorio[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // edits[atividadeId] = { planejado, executado, observacao }
  const [edits, setEdits] = useState<Record<string, { planejado: string; executado: string; observacao: string }>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/controle-atividades?semana=${semana}`)
      .then((r) => r.json())
      .then((data: ObraRelatorio[]) => {
        setRelatorio(data)
        setExpanded(new Set(data.map((o) => o.obra.id)))
        // Seed edits from existing data
        const initial: typeof edits = {}
        data.forEach((o) => o.atividades.forEach((a) => {
          initial[a.id] = {
            planejado: a.percentualPlanejadoSemana > 0 ? String(a.percentualPlanejadoSemana) : '',
            executado: a.percentualExecutadoSemana > 0 ? String(a.percentualExecutadoSemana) : '',
            observacao: a.observacao ?? '',
          }
        }))
        setEdits(initial)
      })
      .finally(() => setLoading(false))
  }, [semana])

  useEffect(() => { load() }, [load])

  const toggleObra = (id: string) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleEdit = (atId: string, field: 'planejado' | 'executado' | 'observacao', val: string) =>
    setEdits((prev) => ({ ...prev, [atId]: { ...prev[atId], [field]: val } }))

  const saveAtividade = async (atividadeId: string) => {
    const e = edits[atividadeId]
    if (!e) return
    setSaving((p) => ({ ...p, [atividadeId]: true }))
    try {
      await fetch('/api/registros-atividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atividadeObraId: atividadeId,
          semana,
          percentualPlanejado: parseFloat(e.planejado) || 0,
          percentualExecutado: parseFloat(e.executado) || 0,
          observacao: e.observacao || null,
        }),
      })
      load()
    } finally {
      setSaving((p) => ({ ...p, [atividadeId]: false }))
    }
  }

  const isCurrentWeek = semana === currentWeek
  const allWeeks = [...getPreviousWeeks(semana, 5).reverse(), semana]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controle de Atividades</h1>
          <p className="text-sm text-slate-500 mt-1">Relatório semanal de evolução das obras em andamento</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <select
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={semana}
              onChange={(e) => setSemana(e.target.value)}
            >
              {allWeeks.map((w) => (
                <option key={w} value={w}>{w}{w === currentWeek ? ' (semana atual)' : ''}</option>
              ))}
            </select>
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : relatorio.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12 text-slate-400">
            Nenhuma obra em andamento com atividades cadastradas para a semana {semana}.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4 print:space-y-8">
          {relatorio.map((item) => {
            const isOpen = expanded.has(item.obra.id)
            return (
              <Card key={item.obra.id} className="print:break-inside-avoid">
                <CardHeader>
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleObra(item.obra.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {item.obra.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900 text-base">{item.obra.nome}</h2>
                        <p className="text-xs text-slate-500">
                          {item.obra.cliente} · {item.periodoInicio} a {item.periodoFim}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Evolução Ponderada</p>
                        <p className="text-xl font-bold text-orange-600">{fmt(item.evolucaoPonderada)}</p>
                      </div>
                      <div className="w-24 h-3 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(item.evolucaoPonderada, 100)}%` }} />
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardBody className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Atividade</th>
                            <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Peso</th>
                            <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Acum. Ant.</th>
                            <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Plan. %</th>
                            <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Exec. %</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Acum. Atual</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-32">Progresso</th>
                            {isCurrentWeek && <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Obs.</th>}
                            {isCurrentWeek && <th className="px-3 py-3"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {item.atividades.map((a) => {
                            const e = edits[a.id] ?? { planejado: '', executado: '', observacao: '' }
                            const execVal = parseFloat(e.executado) || a.percentualExecutadoSemana
                            const planVal = parseFloat(e.planejado) || a.percentualPlanejadoSemana
                            const delta = execVal - planVal
                            return (
                              <tr key={a.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-slate-800">{a.nome}</p>
                                  {a.descricao && <p className="text-xs text-slate-400 truncate max-w-[200px]">{a.descricao}</p>}
                                  {a.unidade && <span className="text-xs text-slate-400">({a.unidade})</span>}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pesoBadge(a.peso)}`}>{a.peso}</span>
                                </td>
                                <td className="px-3 py-3 text-right text-slate-500">{fmt(a.percentualAcumuladoAnterior)}</td>
                                <td className="px-3 py-3 text-right">
                                  {isCurrentWeek ? (
                                    <input
                                      type="number" min="0" max="100" step="0.5"
                                      className="w-20 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                      value={e.planejado}
                                      onChange={(ev) => handleEdit(a.id, 'planejado', ev.target.value)}
                                      placeholder="0"
                                    />
                                  ) : (
                                    <span className="text-blue-600">{fmt(a.percentualPlanejadoSemana)}</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  {isCurrentWeek ? (
                                    <input
                                      type="number" min="0" max="100" step="0.5"
                                      className="w-20 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                      value={e.executado}
                                      onChange={(ev) => handleEdit(a.id, 'executado', ev.target.value)}
                                      placeholder="0"
                                    />
                                  ) : (
                                    <span className={a.percentualExecutadoSemana >= a.percentualPlanejadoSemana ? 'text-green-600' : 'text-red-500'}>
                                      {fmt(a.percentualExecutadoSemana)}
                                      {delta !== 0 && <span className={`ml-1 text-xs ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>({delta > 0 ? '+' : ''}{fmt(delta)})</span>}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-orange-600">{fmt(a.percentualAcumuladoAtual)}</td>
                                <td className="px-4 py-3">
                                  <div className="w-full min-w-[80px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${a.percentualAcumuladoAtual >= 100 ? 'bg-green-500' : a.percentualExecutadoSemana >= a.percentualPlanejadoSemana ? 'bg-teal-500' : 'bg-orange-400'}`}
                                      style={{ width: `${Math.min(a.percentualAcumuladoAtual, 100)}%` }}
                                    />
                                  </div>
                                </td>
                                {isCurrentWeek && (
                                  <td className="px-3 py-3">
                                    <input
                                      type="text"
                                      className="w-32 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                      value={e.observacao}
                                      onChange={(ev) => handleEdit(a.id, 'observacao', ev.target.value)}
                                      placeholder="Observação"
                                    />
                                  </td>
                                )}
                                {isCurrentWeek && (
                                  <td className="px-3 py-3">
                                    <button
                                      onClick={() => saveAtividade(a.id)}
                                      disabled={saving[a.id]}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                                    >
                                      <Save size={12} /> {saving[a.id] ? '...' : 'Salvar'}
                                    </button>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-orange-50 border-t-2 border-orange-200">
                            <td colSpan={isCurrentWeek ? 9 : 7} className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-700 text-sm">Evolução Ponderada da Obra</span>
                                <span className="font-bold text-orange-600 text-lg">{fmt(item.evolucaoPonderada)}</span>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardBody>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
