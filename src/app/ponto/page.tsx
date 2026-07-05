'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Clock, Calculator, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { formatCurrency } from '@/lib/utils'

interface Funcionario { id: string; nome: string; cargo: string }
interface Obra { id: string; nome: string; status: string }
interface RegistroPonto {
  id: string; tipo: string; dataHora: string; observacao: string | null
  status: string; alertaImpar: boolean
  funcionario: { id: string; nome: string; cargo: string }
  obra: { nome: string } | null; registradoPor: { name: string }
}
interface ConsolidaPar {
  entradaId: string; saidaId: string | null; data: string
  entrada: string; saida: string | null; minutos: number; horas: number; obra: string | null
}
interface ConsolidaResult {
  funcionario: { id: string; nome: string; cargo: string; valorHora: number | null }
  periodo: { startDate: string; endDate: string }
  pares: ConsolidaPar[]; totalMinutos: number; totalHoras: number
  valorHora: number | null; totalAPagar: number | null
}
interface Session { userId: string; grupos: string[] }

// Group by day → by funcionário
function groupPontos(pontos: RegistroPonto[]) {
  const days: Record<string, Record<string, RegistroPonto[]>> = {}
  for (const p of pontos) {
    const day = p.dataHora.slice(0, 10)
    const fid = p.funcionario.id
    if (!days[day]) days[day] = {}
    if (!days[day][fid]) days[day][fid] = []
    days[day][fid].push(p)
  }
  // Sort each employee's records asc by time
  for (const day of Object.values(days)) {
    for (const records of Object.values(day)) {
      records.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
    }
  }
  return days
}

const STATUS_LABEL: Record<string, string> = { em_aberto: 'Em Aberto', aguarda_pagamento: 'Aguarda Pgto.', pago: 'Pago' }
const STATUS_COR: Record<string, string> = {
  em_aberto: 'bg-slate-100 text-slate-600',
  aguarda_pagamento: 'bg-amber-100 text-amber-700',
  pago: 'bg-green-100 text-green-700',
}
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const fmtMin = (min: number) => { const h = Math.floor(min / 60); const m = min % 60; return `${h}h${m > 0 ? `${m.toString().padStart(2, '0')}m` : ''}` }

export default function PontoPage() {
  const [pontos, setPontos] = useState<RegistroPonto[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConsolidar, setModalConsolidar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [consolidando, setConsolidando] = useState(false)
  const [consolidaResult, setConsolidaResult] = useState<ConsolidaResult | null>(null)
  const [consolidaFuncId, setConsolidaFuncId] = useState('')
  const [consolidaInicio, setConsolidaInicio] = useState('')
  const [consolidaFim, setConsolidaFim] = useState('')
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('')
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroInicio, setFiltroInicio] = useState('')
  const [filtroFim, setFiltroFim] = useState('')

  const { register, handleSubmit, reset } = useForm()
  const isAdmin = session?.grupos.includes('Administrador') ?? false

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroFuncionario) params.set('funcionarioId', filtroFuncionario)
    if (filtroObra) params.set('obraId', filtroObra)
    if (filtroInicio) params.set('startDate', filtroInicio)
    if (filtroFim) params.set('endDate', filtroFim)

    const [pontosRes, funcsRes, obrasRes] = await Promise.all([
      fetch(`/api/ponto?${params}`).then((r) => r.json()),
      funcionarios.length ? Promise.resolve(funcionarios) : fetch('/api/funcionarios').then((r) => r.json()),
      obras.length ? Promise.resolve(obras) : fetch('/api/obras').then((r) => r.json()),
    ])

    setPontos(pontosRes)
    setFuncionarios(funcsRes)
    setObras(obrasRes)
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.ok ? r.json() : null).then(setSession)
    load()
  }, [])

  const onSubmit = async (data: any) => {
    setSaving(true)
    try {
      await fetch('/api/ponto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      setModalOpen(false)
      reset()
      load()
    } finally { setSaving(false) }
  }

  const deletePonto = async (id: string) => {
    if (!confirm('Remover este registro?')) return
    await fetch(`/api/ponto/${id}`, { method: 'DELETE' })
    load()
  }

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/ponto/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setPontos((prev) => prev.map((p) => p.id === id ? { ...p, status } : p))
    } else {
      const err = await res.json()
      alert(err.error)
    }
  }

  const consolidar = async () => {
    if (!consolidaFuncId || !consolidaInicio || !consolidaFim) return
    setConsolidando(true); setConsolidaResult(null)
    try {
      const params = new URLSearchParams({ funcionarioId: consolidaFuncId, startDate: consolidaInicio, endDate: consolidaFim })
      const res = await fetch(`/api/ponto/consolidar?${params}`)
      const data = await res.json()
      if (res.ok) setConsolidaResult(data); else alert(data.error)
    } finally { setConsolidando(false) }
  }

  const marcarAguardaPagamento = async () => {
    if (!consolidaResult) return
    const ids = consolidaResult.pares.flatMap((p) => [p.entradaId, p.saidaId].filter(Boolean) as string[])
    await Promise.all(ids.map((id) => fetch(`/api/ponto/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'aguarda_pagamento' }),
    })))
    setModalConsolidar(false); load()
  }

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => { const n = new Set(prev); n.has(day) ? n.delete(day) : n.add(day); return n })
  }

  const grouped = groupPontos(pontos)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registro de Ponto</h1>
          <p className="text-slate-500 text-sm mt-1">{pontos.length} registro{pontos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setConsolidaResult(null); setModalConsolidar(true) }}>
            <Calculator className="w-4 h-4" /> Consolidar
          </Button>
          <Button onClick={() => { reset({ dataHora: new Date().toISOString().slice(0, 16) }); setModalOpen(true) }}>
            <Plus className="w-4 h-4" /> Registrar Ponto
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Funcionário</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={filtroFuncionario} onChange={(e) => setFiltroFuncionario(e.target.value)}>
                <option value="">Todos</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Obra</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)}>
                <option value="">Todas</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">De</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Até</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={load}>Filtrar</Button>
            <Button size="sm" variant="secondary" onClick={() => {
              setFiltroFuncionario(''); setFiltroObra(''); setFiltroInicio(''); setFiltroFim('')
              setTimeout(load, 0)
            }}>Limpar</Button>
          </div>
        </CardBody>
      </Card>

      {/* Lista por dia → por funcionário */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : pontos.length === 0 ? (
        <Card><CardBody className="py-12 text-center text-slate-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          Nenhum registro encontrado
        </CardBody></Card>
      ) : (
        Object.entries(grouped).map(([day, byFunc]) => {
          const hasImpar = Object.values(byFunc).some((recs) => recs.some((r) => r.alertaImpar))
          const isExpanded = expandedDays.has(day)
          return (
            <Card key={day} className={hasImpar ? 'ring-2 ring-amber-400' : ''}>
              <CardHeader>
                <button className="w-full flex items-center justify-between" onClick={() => toggleDay(day)}>
                  <div className="flex items-center gap-2">
                    {hasImpar && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    <h3 className="font-semibold text-slate-700">
                      {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      <span className="ml-2 text-sm font-normal text-slate-400">
                        ({Object.values(byFunc).reduce((s, r) => s + r.length, 0)} registros · {Object.keys(byFunc).length} funcionário{Object.keys(byFunc).length !== 1 ? 's' : ''})
                      </span>
                    </h3>
                    {hasImpar && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Registros ímpares — verificar</span>}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
              </CardHeader>

              <CardBody className="p-0">
                {Object.entries(byFunc).map(([funcId, records]) => {
                  const func = records[0].funcionario
                  const isOdd = records.length % 2 !== 0
                  const entradas = records.filter((r) => r.tipo === 'entrada')
                  const saidas = records.filter((r) => r.tipo === 'saida')

                  // Compute all status of this employee's records
                  const allStatus = [...new Set(records.map((r) => r.status))]
                  const mainStatus = allStatus.length === 1 ? allStatus[0] : 'em_aberto'

                  return (
                    <div key={funcId} className={`border-t border-slate-100 px-6 py-3 ${isOdd ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Employee info */}
                        <div className="flex items-center gap-2 min-w-[160px]">
                          {isOdd && (
                            <span title="Número ímpar de registros">
                              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            </span>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{func.nome}</p>
                            <p className="text-xs text-slate-400">{func.cargo}</p>
                          </div>
                        </div>

                        {/* E1 S1 E2 S2 */}
                        <div className="flex items-center gap-3 flex-wrap flex-1">
                          {[0, 1, 2, 3].map((idx) => {
                            const entrada = entradas[idx]
                            const saida = saidas[idx]
                            if (!entrada && !saida) return null
                            const pairNum = idx + 1
                            return (
                              <div key={idx} className="flex items-center gap-1.5 text-xs">
                                {entrada && (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg font-mono font-semibold">
                                    E{pairNum} {fmtTime(entrada.dataHora)}
                                  </span>
                                )}
                                {saida && (
                                  <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg font-mono font-semibold">
                                    S{pairNum} {fmtTime(saida.dataHora)}
                                  </span>
                                )}
                                {entrada && !saida && (
                                  <span className="text-amber-500 text-xs animate-pulse">sem saída</span>
                                )}
                              </div>
                            )
                          })}
                          {records.length > 8 && (
                            <span className="text-xs text-slate-400">+{records.length - 8} mais</span>
                          )}
                        </div>

                        {/* Status + admin controls */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COR[mainStatus] ?? STATUS_COR.em_aberto}`}>
                            {STATUS_LABEL[mainStatus] ?? mainStatus}
                          </span>

                          {isAdmin && (
                            <div className="flex gap-1">
                              {mainStatus !== 'em_aberto' && (
                                <button onClick={() => records.forEach((r) => updateStatus(r.id, 'em_aberto'))}
                                  className="text-xs text-slate-500 border border-slate-300 rounded px-1.5 py-0.5 hover:bg-slate-100"
                                  title="Retornar para em aberto">↩ Abrir</button>
                              )}
                              {mainStatus === 'em_aberto' && (
                                <button onClick={() => records.forEach((r) => updateStatus(r.id, 'aguarda_pagamento'))}
                                  className="text-xs text-amber-600 border border-amber-300 rounded px-1.5 py-0.5 hover:bg-amber-50">→ Pgto.</button>
                              )}
                              {mainStatus === 'aguarda_pagamento' && (
                                <button onClick={() => records.forEach((r) => updateStatus(r.id, 'pago'))}
                                  className="text-xs text-green-600 border border-green-300 rounded px-1.5 py-0.5 hover:bg-green-50">✓ Pago</button>
                              )}
                            </div>
                          )}

                          {/* Delete all for this employee on this day (admin only) */}
                          {isAdmin && isExpanded && records.map((r) => (
                            <button key={r.id} onClick={() => deletePonto(r.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors" title={`Excluir ${r.tipo}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )
        })
      )}

      {/* Modal Registrar Ponto */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Ponto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Funcionário *</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2" {...register('funcionarioId', { required: true })}>
              <option value="">Selecione...</option>
              {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Tipo *</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2" {...register('tipo', { required: true })}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Data e Hora *</label>
            <input type="datetime-local" className="w-full border border-slate-200 rounded-lg px-3 py-2"
              {...register('dataHora', { required: true })} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Obra (opcional)</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2" {...register('obraId')}>
              <option value="">— sem obra —</option>
              {obras.filter((o: any) => o.status === 'em_andamento').map((o) =>
                <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Observação</label>
            <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2"
              placeholder="Opcional" {...register('observacao')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Consolidar */}
      <Modal isOpen={modalConsolidar} onClose={() => setModalConsolidar(false)} title="Consolidar Horas" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Funcionário *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={consolidaFuncId} onChange={(e) => { setConsolidaFuncId(e.target.value); setConsolidaResult(null) }}>
                <option value="">Selecione...</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">De *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={consolidaInicio} onChange={(e) => { setConsolidaInicio(e.target.value); setConsolidaResult(null) }} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Até *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={consolidaFim} onChange={(e) => { setConsolidaFim(e.target.value); setConsolidaResult(null) }} />
            </div>
          </div>
          <Button onClick={consolidar} disabled={consolidando || !consolidaFuncId || !consolidaInicio || !consolidaFim}>
            {consolidando ? 'Calculando...' : 'Calcular Horas'}
          </Button>

          {consolidaResult && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{consolidaResult.funcionario.nome}</p>
                  <p className="text-sm text-slate-500">{consolidaResult.funcionario.cargo}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Período</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date(consolidaResult.periodo.startDate + 'T12:00').toLocaleDateString('pt-BR')} — {new Date(consolidaResult.periodo.endDate + 'T12:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-3 py-2 text-xs font-semibold text-slate-500">Data</th>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-500">Entrada</th>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-500">Saída</th>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-500">Horas</th>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-500">Obra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidaResult.pares.map((p, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono text-xs">{new Date(p.data + 'T12:00').toLocaleDateString('pt-BR')}</td>
                        <td className="px-3 py-2 text-emerald-600 font-mono">{fmtTime(p.entrada)}</td>
                        <td className="px-3 py-2 text-red-500 font-mono">
                          {p.saida ? fmtTime(p.saida) : <span className="text-amber-500">Aberto</span>}
                        </td>
                        <td className="px-3 py-2 font-semibold">{p.minutos > 0 ? fmtMin(p.minutos) : '—'}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{p.obra ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Total de Horas</p>
                  <p className="text-xl font-bold text-slate-800">{fmtMin(consolidaResult.totalMinutos)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Valor/Hora</p>
                  <p className="text-xl font-bold text-orange-600">{consolidaResult.valorHora ? formatCurrency(consolidaResult.valorHora) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total a Pagar</p>
                  <p className="text-xl font-bold text-purple-600">
                    {consolidaResult.totalAPagar !== null ? formatCurrency(consolidaResult.totalAPagar) : '—'}
                  </p>
                  {!consolidaResult.valorHora && <p className="text-xs text-amber-600 mt-1">Cadastre o valor/hora do funcionário</p>}
                </div>
              </div>

              {isAdmin && (
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setModalConsolidar(false)}>Fechar</Button>
                  <Button onClick={marcarAguardaPagamento}>Marcar como "Aguarda Pagamento"</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
