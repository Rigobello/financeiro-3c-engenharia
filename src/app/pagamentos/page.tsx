'use client'

import { useEffect, useState } from 'react'
import { Plus, Users, Trash2, Calendar, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate, TIPOS_PAGAMENTO } from '@/lib/utils'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'

interface Pagamento {
  id: string; valor: number; tipo: string; data: string; descricao: string | null
  obraId: string; funcionarioId: string
  funcionario: { nome: string; cargo: string }; obra: { nome: string }
}
interface Obra { id: string; nome: string }
interface Funcionario { id: string; nome: string }

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroFuncionario, setFiltroFuncionario] = useState('')
  const [filtroObra, setFiltroObra] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'lista' | 'mensal'>('lista')

  const { register, handleSubmit, reset } = useForm()

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/pagamentos').then((r) => r.json()),
      fetch('/api/obras').then((r) => r.json()),
      fetch('/api/funcionarios').then((r) => r.json()),
    ]).then(([pags, obs, funcs]) => {
      setPagamentos(pags); setObras(obs); setFuncionarios(funcs)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      await fetch('/api/pagamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      setModalOpen(false); reset(); load()
    } finally { setSaving(false) }
  }

  const deletePagamento = async (id: string) => {
    if (!confirm('Excluir este pagamento?')) return
    await fetch(`/api/pagamentos/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = pagamentos.filter((p) => {
    if (filtroFuncionario && p.funcionarioId !== filtroFuncionario) return false
    if (filtroObra && p.obraId !== filtroObra) return false
    return true
  })

  const totalPago = filtered.reduce((s, p) => s + p.valor, 0)

  const porFuncionario = filtered.reduce<Record<string, { nome: string; total: number; count: number }>>(
    (acc, p) => {
      if (!acc[p.funcionarioId]) acc[p.funcionarioId] = { nome: p.funcionario.nome, total: 0, count: 0 }
      acc[p.funcionarioId].total += p.valor; acc[p.funcionarioId].count++
      return acc
    }, {}
  )

  // Monthly consolidation
  const porMes = pagamentos.reduce<Record<string, { total: number; count: number; porFuncionario: Record<string, number> }>>(
    (acc, p) => {
      const d = new Date(p.data)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!acc[key]) acc[key] = { total: 0, count: 0, porFuncionario: {} }
      acc[key].total += p.valor; acc[key].count++
      acc[key].porFuncionario[p.funcionario.nome] = (acc[key].porFuncionario[p.funcionario.nome] ?? 0) + p.valor
      return acc
    }, {}
  )

  const mesesOrdenados = Object.entries(porMes).sort(([a], [b]) => b.localeCompare(a))
  const meses12 = mesesOrdenados.slice(0, 12)

  const tabCls = (t: 'lista' | 'mensal') =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === t ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pagamentos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {pagamentos.length} pagamento(s) · Total: {formatCurrency(pagamentos.reduce((s, p) => s + p.valor, 0))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button className={tabCls('lista')} onClick={() => setActiveTab('lista')}>
              <TrendingUp className="w-4 h-4 inline mr-1" /> Lista
            </button>
            <button className={tabCls('mensal')} onClick={() => setActiveTab('mensal')}>
              <Calendar className="w-4 h-4 inline mr-1" /> Consolidado Mensal
            </button>
          </div>
          <Button onClick={() => { reset({ tipo: 'salario', data: new Date().toISOString().split('T')[0] }); setModalOpen(true) }}>
            <Plus size={16} /> Novo Pagamento
          </Button>
        </div>
      </div>

      {/* ── ABA LISTA ─────────────────────────────────────────── */}
      {activeTab === 'lista' && (
        <>
          <div className="flex gap-3">
            <select className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={filtroFuncionario} onChange={(e) => setFiltroFuncionario(e.target.value)}>
              <option value="">Todos os funcionários</option>
              {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <select className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)}>
              <option value="">Todas as obras</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h2 className="font-semibold text-slate-700 text-sm">Por Funcionário</h2>
              {Object.entries(porFuncionario).length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum pagamento</p>
              ) : Object.entries(porFuncionario).map(([id, data]) => (
                <Card key={id}>
                  <CardBody className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Users size={14} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{data.nome}</p>
                        <p className="text-xs text-slate-400">{data.count} pgto(s)</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-purple-600">{formatCurrency(data.total)}</p>
                  </CardBody>
                </Card>
              ))}
              {Object.keys(porFuncionario).length > 0 && (
                <div className="bg-purple-50 rounded-lg px-4 py-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-purple-700">Total Filtrado</span>
                    <span className="font-bold text-purple-700">{formatCurrency(totalPago)}</span>
                  </div>
                </div>
              )}
            </div>

            <Card className="lg:col-span-2">
              <CardBody className="p-0">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-12">Nenhum pagamento encontrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Data</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Funcionário</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Obra</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Tipo</th>
                          <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Valor</th>
                          <th className="px-5 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatDate(p.data)}</td>
                            <td className="px-5 py-3">
                              <p className="font-medium text-slate-800">{p.funcionario.nome}</p>
                              <p className="text-xs text-slate-400">{p.funcionario.cargo}</p>
                            </td>
                            <td className="px-5 py-3 text-slate-500">{p.obra.nome}</td>
                            <td className="px-5 py-3 text-slate-500">
                              {TIPOS_PAGAMENTO.find((t) => t.value === p.tipo)?.label ?? p.tipo}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-purple-600">{formatCurrency(p.valor)}</td>
                            <td className="px-5 py-3 text-right">
                              <button onClick={() => deletePagamento(p.id)} className="text-slate-300 hover:text-red-500">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* ── ABA CONSOLIDADO MENSAL ────────────────────────────── */}
      {activeTab === 'mensal' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Totais do ano atual */}
            {(() => {
              const ano = new Date().getFullYear()
              const anoData = meses12.filter(([k]) => k.startsWith(String(ano)))
              const totalAno = anoData.reduce((s, [, v]) => s + v.total, 0)
              const maxMes = Math.max(...anoData.map(([, v]) => v.total), 1)
              return (
                <>
                  <Card className="md:col-span-1">
                    <CardBody>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Total {ano}</p>
                      <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalAno)}</p>
                      <p className="text-xs text-slate-400 mt-1">{anoData.reduce((s, [, v]) => s + v.count, 0)} pagamentos</p>
                    </CardBody>
                  </Card>
                  <Card className="md:col-span-2">
                    <CardBody>
                      <p className="text-xs text-slate-400 font-semibold uppercase mb-3">Evolução Mensal {ano}</p>
                      <div className="flex items-end gap-1 h-16">
                        {Array.from({ length: 12 }, (_, i) => {
                          const key = `${ano}-${String(i + 1).padStart(2, '0')}`
                          const v = porMes[key]?.total ?? 0
                          const pct = Math.round((v / maxMes) * 100)
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full rounded-t transition-all" style={{ height: `${Math.max(pct, 2)}%`, background: v > 0 ? '#5165a8' : '#e2e8f0' }} />
                              <span className="text-[9px] text-slate-400">{MESES[i]}</span>
                            </div>
                          )
                        })}
                      </div>
                    </CardBody>
                  </Card>
                </>
              )
            })()}
          </div>

          {/* Tabela mensal */}
          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Mês/Ano</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Qtd</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase">Total</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Por Funcionário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {meses12.map(([key, data]) => {
                      const [year, month] = key.split('-')
                      return (
                        <tr key={key} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-semibold text-slate-800">
                            {MESES[Number(month) - 1]}/{year}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-500">{data.count}</td>
                          <td className="px-5 py-3 text-right font-bold text-purple-600">{formatCurrency(data.total)}</td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(data.porFuncionario).map(([nome, valor]) => (
                                <span key={nome} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                  {nome.split(' ')[0]}: {formatCurrency(valor)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Pagamento">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Funcionário *" options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))}
            {...register('funcionarioId', { required: true })} />
          <Select label="Obra *" options={obras.map((o) => ({ value: o.id, label: o.nome }))}
            {...register('obraId', { required: true })} />
          <Select label="Tipo *" options={TIPOS_PAGAMENTO} {...register('tipo', { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor (R$) *" type="number" step="0.01" {...register('valor', { required: true })} placeholder="0,00" />
            <Input label="Data *" type="date" {...register('data', { required: true })} />
          </div>
          <Input label="Observação" {...register('descricao')} placeholder="Opcional" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
