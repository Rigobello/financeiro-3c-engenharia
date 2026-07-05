'use client'

import { useEffect, useState, useRef } from 'react'
import { Printer, RefreshCw, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface RegistroAtividade {
  semana: string
  percentualPlanejado: number
  percentualExecutado: number
  observacao: string | null
}

interface AtividadeRelatorio {
  id: string
  nome: string
  descricao: string | null
  peso: number
  unidade: string | null
  acumuladoAnterior: number
  planejadoSemana: number
  executadoSemana: number
  acumuladoAtual: number
  ultimosRegistros: RegistroAtividade[]
}

interface ObraRelatorio {
  obraId: string
  obraNome: string
  obraCliente: string
  semana: string
  semanaInicio: string
  semanaFim: string
  evolucaoPonderada: number
  atividades: AtividadeRelatorio[]
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
  const weeks: string[] = []
  for (let i = 0; i < count; i++) {
    w--
    if (w < 1) { y--; w = 52 }
    weeks.push(`${y}-W${String(w).padStart(2, '0')}`)
  }
  return weeks
}

export default function ControleAtividadesPage() {
  const today = new Date()
  const currentWeek = getISOWeek(today)
  const [semana, setSemana] = useState(currentWeek)
  const [relatorio, setRelatorio] = useState<ObraRelatorio[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const printRef = useRef<HTMLDivElement>(null)

  const load = () => {
    setLoading(true)
    fetch(`/api/controle-atividades?semana=${semana}`)
      .then((r) => r.json())
      .then((data) => {
        setRelatorio(data)
        setExpanded(new Set(data.map((o: ObraRelatorio) => o.obraId)))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [semana])

  const toggleObra = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handlePrint = () => window.print()

  const prevWeeks = getPreviousWeeks(semana, 5)
  const allWeeks = [semana, ...prevWeeks].reverse()

  const fmtPct = (v: number) => `${v.toFixed(1)}%`

  const pesoBadge = (p: number) =>
    p === 3 ? 'bg-orange-100 text-orange-700' : p === 2 ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controle de Atividades</h1>
          <p className="text-sm text-slate-500 mt-1">Relatório semanal de evolução das obras em andamento</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <select
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={semana}
              onChange={(e) => setSemana(e.target.value)}
            >
              {allWeeks.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </Button>
          <Button onClick={handlePrint}>
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
        <div ref={printRef} className="space-y-4 print:space-y-8">
          {relatorio.map((obra) => {
            const isOpen = expanded.has(obra.obraId)
            return (
              <Card key={obra.obraId} className="print:break-inside-avoid">
                {/* Obra header */}
                <CardHeader>
                  <div
                    className="flex items-center justify-between cursor-pointer print:cursor-default"
                    onClick={() => toggleObra(obra.obraId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                        {obra.obraNome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900 text-base">{obra.obraNome}</h2>
                        <p className="text-xs text-slate-500">{obra.obraCliente} · Semana {obra.semana} ({obra.semanaInicio} a {obra.semanaFim})</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Evolução geral */}
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Evolução Ponderada</p>
                        <p className="text-xl font-bold text-orange-600">{fmtPct(obra.evolucaoPonderada)}</p>
                      </div>
                      {/* Mini bar */}
                      <div className="w-24 h-3 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all"
                          style={{ width: `${Math.min(obra.evolucaoPonderada, 100)}%` }}
                        />
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-slate-400 print:hidden" /> : <ChevronDown size={16} className="text-slate-400 print:hidden" />}
                    </div>
                  </div>
                </CardHeader>

                {(isOpen) && (
                  <CardBody className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Atividade</th>
                            <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Peso</th>
                            <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Acum. Ant.</th>
                            <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Plan. Sem.</th>
                            <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Exec. Sem.</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Acum. Atual</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Progresso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {obra.atividades.map((a) => {
                            const delta = a.executadoSemana - a.planejadoSemana
                            return (
                              <tr key={a.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-slate-800">{a.nome}</p>
                                  {a.descricao && <p className="text-xs text-slate-400 truncate max-w-xs">{a.descricao}</p>}
                                  {a.unidade && <span className="text-xs text-slate-400">({a.unidade})</span>}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pesoBadge(a.peso)}`}>{a.peso}</span>
                                </td>
                                <td className="px-3 py-3 text-right text-slate-500">{fmtPct(a.acumuladoAnterior)}</td>
                                <td className="px-3 py-3 text-right text-blue-600">{fmtPct(a.planejadoSemana)}</td>
                                <td className="px-3 py-3 text-right">
                                  <span className={a.executadoSemana >= a.planejadoSemana ? 'text-green-600' : 'text-red-500'}>
                                    {fmtPct(a.executadoSemana)}
                                  </span>
                                  {delta !== 0 && (
                                    <span className={`ml-1 text-xs ${delta > 0 ? 'text-green-500' : 'text-red-400'}`}>
                                      ({delta > 0 ? '+' : ''}{fmtPct(delta)})
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-orange-600">{fmtPct(a.acumuladoAtual)}</td>
                                <td className="px-4 py-3">
                                  <div className="w-full min-w-[80px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${a.acumuladoAtual >= 100 ? 'bg-green-500' : a.executadoSemana >= a.planejadoSemana ? 'bg-teal-500' : 'bg-orange-400'}`}
                                      style={{ width: `${Math.min(a.acumuladoAtual, 100)}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-orange-50 border-t-2 border-orange-200">
                            <td colSpan={6} className="px-4 py-3 font-bold text-slate-700 text-sm">
                              Evolução Ponderada da Obra
                            </td>
                            <td className="px-4 py-3 font-bold text-orange-600 text-right text-base">
                              {fmtPct(obra.evolucaoPonderada)}
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

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:cursor-default { cursor: default; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
