'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, Wallet, Users,
  Trash2, HardHat
} from 'lucide-react'
import { formatCurrency, formatDate, CATEGORIAS_LANCAMENTO, TIPOS_PAGAMENTO, STATUS_OBRA } from '@/lib/utils'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface ObraDetail {
  id: string
  nome: string
  cliente: string
  endereco: string | null
  cidade: string | null
  dataInicio: string
  dataFim: string | null
  status: string
  orcamento: number
  saldo: number
  totalEntradas: number
  totalSaidas: number
  totalPagamentos: number
  lancamentos: {
    id: string
    tipo: string
    valor: number
    descricao: string
    categoria: string
    data: string
  }[]
  pagamentos: {
    id: string
    valor: number
    tipo: string
    data: string
    descricao: string | null
    funcionario: { nome: string; cargo: string }
  }[]
  funcionariosObra: {
    id: string
    funcionario: { id: string; nome: string; cargo: string; salarioBase: number }
  }[]
}

const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export default function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [obra, setObra] = useState<ObraDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'pagamentos'>('lancamentos')
  const [modalLancamento, setModalLancamento] = useState(false)
  const [modalPagamento, setModalPagamento] = useState(false)
  const [saving, setSaving] = useState(false)
  const [funcionarios, setFuncionarios] = useState<{ id: string; nome: string }[]>([])

  const { register: regL, handleSubmit: handleL, reset: resetL } = useForm()
  const { register: regP, handleSubmit: handleP, reset: resetP } = useForm()

  const load = () => {
    fetch(`/api/obras/${id}`)
      .then((r) => r.json())
      .then(setObra)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    fetch('/api/funcionarios')
      .then((r) => r.json())
      .then((data) => setFuncionarios(data.map((f: { id: string; nome: string }) => ({ id: f.id, nome: f.nome }))))
  }, [id])

  const submitLancamento = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, obraId: id }),
      })
      setModalLancamento(false)
      resetL()
      load()
    } finally {
      setSaving(false)
    }
  }

  const submitPagamento = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, obraId: id }),
      })
      setModalPagamento(false)
      resetP()
      load()
    } finally {
      setSaving(false)
    }
  }

  const deleteLancamento = async (lancId: string) => {
    if (!confirm('Excluir este lançamento?')) return
    await fetch(`/api/lancamentos/${lancId}`, { method: 'DELETE' })
    load()
  }

  const deletePagamento = async (pagId: string) => {
    if (!confirm('Excluir este pagamento?')) return
    await fetch(`/api/pagamentos/${pagId}`, { method: 'DELETE' })
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!obra) return <div className="p-6 text-slate-500">Obra não encontrada</div>

  const st = STATUS_OBRA[obra.status] ?? { label: obra.status, color: 'bg-slate-100 text-slate-700' }

  const categoriaData = CATEGORIAS_LANCAMENTO.map((cat) => {
    const total = obra.lancamentos
      .filter((l) => l.tipo === 'saida' && l.categoria === cat.value)
      .reduce((s, l) => s + l.valor, 0)
    return { name: cat.label, value: total }
  }).filter((d) => d.value > 0)

  const funcOptions = funcionarios.map((f) => ({ value: f.id, label: f.nome }))
  const tipoLancOptions = [
    { value: 'entrada', label: 'Entrada (Receita)' },
    { value: 'saida', label: 'Saída (Despesa)' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{obra.nome}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
              {st.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {obra.cliente} {obra.cidade ? `· ${obra.cidade}` : ''}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Saldo', value: obra.saldo, color: obra.saldo >= 0 ? 'text-green-600' : 'text-red-500', icon: Wallet, bg: obra.saldo >= 0 ? 'bg-green-500' : 'bg-red-500' },
          { label: 'Entradas', value: obra.totalEntradas, color: 'text-blue-600', icon: TrendingUp, bg: 'bg-blue-500' },
          { label: 'Saídas', value: obra.totalSaidas, color: 'text-red-500', icon: TrendingDown, bg: 'bg-red-400' },
          { label: 'Pagamentos', value: obra.totalPagamentos, color: 'text-purple-600', icon: Users, bg: 'bg-purple-500' },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400">{s.label}</p>
                <p className={`font-bold text-base ${s.color}`}>{formatCurrency(s.value)}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800">Informações</h2>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Orçamento</p>
              <p className="font-medium">{formatCurrency(obra.orcamento)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Início</p>
              <p className="font-medium">{formatDate(obra.dataInicio)}</p>
            </div>
            {obra.dataFim && (
              <div>
                <p className="text-xs text-slate-400">Previsão de Término</p>
                <p className="font-medium">{formatDate(obra.dataFim)}</p>
              </div>
            )}
            {obra.endereco && (
              <div>
                <p className="text-xs text-slate-400">Endereço</p>
                <p className="font-medium">{obra.endereco}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 mb-1">Utilização do Orçamento</p>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                {(() => {
                  const pct = obra.orcamento > 0 ? Math.min(100, (obra.totalSaidas / obra.orcamento) * 100) : 0
                  return (
                    <div
                      className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  )
                })()}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {((obra.totalSaidas / obra.orcamento) * 100).toFixed(1)}% utilizado
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Gráfico de categorias */}
        {categoriaData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="font-semibold text-slate-800">Despesas por Categoria</h2>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoriaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {categoriaData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('lancamentos')}
                className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === 'lancamentos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Lançamentos ({obra.lancamentos.length})
              </button>
              <button
                onClick={() => setActiveTab('pagamentos')}
                className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === 'pagamentos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pagamentos ({obra.pagamentos.length})
              </button>
            </div>
            <Button
              size="sm"
              onClick={() => activeTab === 'lancamentos' ? (resetL({ tipo: 'saida', data: new Date().toISOString().split('T')[0], categoria: 'material' }), setModalLancamento(true)) : (resetP({ tipo: 'salario', data: new Date().toISOString().split('T')[0] }), setModalPagamento(true))}
            >
              <Plus size={14} /> Novo
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {activeTab === 'lancamentos' ? (
            obra.lancamentos.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">Nenhum lançamento</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {obra.lancamentos.map((l) => (
                  <div key={l.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${l.tipo === 'entrada' ? 'bg-green-500' : 'bg-red-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{l.descricao}</p>
                        <p className="text-xs text-slate-400">
                          {CATEGORIAS_LANCAMENTO.find((c) => c.value === l.categoria)?.label ?? l.categoria} · {formatDate(l.data)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`text-sm font-semibold ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                        {l.tipo === 'entrada' ? '+' : '-'} {formatCurrency(l.valor)}
                      </p>
                      <button onClick={() => deleteLancamento(l.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            obra.pagamentos.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">Nenhum pagamento</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {obra.pagamentos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.funcionario.nome}</p>
                      <p className="text-xs text-slate-400">
                        {TIPOS_PAGAMENTO.find((t) => t.value === p.tipo)?.label ?? p.tipo} · {formatDate(p.data)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-semibold text-purple-600">- {formatCurrency(p.valor)}</p>
                      <button onClick={() => deletePagamento(p.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardBody>
      </Card>

      {/* Modal Lançamento */}
      <Modal isOpen={modalLancamento} onClose={() => setModalLancamento(false)} title="Novo Lançamento">
        <form onSubmit={handleL(submitLancamento)} className="space-y-4">
          <Select label="Tipo *" options={tipoLancOptions} {...regL('tipo', { required: true })} />
          <Input label="Descrição *" {...regL('descricao', { required: true })} placeholder="Ex: Compra de cimento" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor (R$) *" type="number" step="0.01" {...regL('valor', { required: true })} placeholder="0,00" />
            <Input label="Data *" type="date" {...regL('data', { required: true })} />
          </div>
          <Select
            label="Categoria *"
            options={CATEGORIAS_LANCAMENTO}
            {...regL('categoria', { required: true })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalLancamento(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Pagamento */}
      <Modal isOpen={modalPagamento} onClose={() => setModalPagamento(false)} title="Novo Pagamento">
        <form onSubmit={handleP(submitPagamento)} className="space-y-4">
          {funcOptions.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum funcionário cadastrado. <Link href="/funcionarios" className="text-orange-500 hover:underline">Cadastrar agora</Link></p>
          ) : (
            <Select label="Funcionário *" options={funcOptions} {...regP('funcionarioId', { required: true })} />
          )}
          <Select label="Tipo *" options={TIPOS_PAGAMENTO} {...regP('tipo', { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor (R$) *" type="number" step="0.01" {...regP('valor', { required: true })} placeholder="0,00" />
            <Input label="Data *" type="date" {...regP('data', { required: true })} />
          </div>
          <Input label="Observação" {...regP('descricao')} placeholder="Opcional" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalPagamento(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} disabled={funcOptions.length === 0}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
