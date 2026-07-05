'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, Wallet, Users,
  Trash2, HardHat, Camera, X, Activity, GripVertical, Pencil
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
  id: string; nome: string; cliente: string; endereco: string | null
  cidade: string | null; dataInicio: string; dataFim: string | null
  status: string; orcamento: number; saldo: number
  totalEntradas: number; totalSaidas: number; totalPagamentos: number
  lancamentos: { id: string; tipo: string; valor: number; descricao: string; categoria: string; data: string }[]
  pagamentos: { id: string; valor: number; tipo: string; data: string; descricao: string | null; funcionario: { nome: string; cargo: string } }[]
  funcionariosObra: { id: string; funcionario: { id: string; nome: string; cargo: string; salarioBase: number } }[]
}

interface AtividadeObra {
  id: string; nome: string; descricao: string | null
  peso: number; unidade: string | null; ordem: number; status: string
}

const COLORS = ['#22c55e', '#5165a8', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
const PESOS = [{ value: '1', label: 'Baixo (1)' }, { value: '2', label: 'Médio (2)' }, { value: '3', label: 'Alto (3)' }]
const PESO_LABEL: Record<number, string> = { 1: 'Baixo', 2: 'Médio', 3: 'Alto' }
const PESO_COLOR: Record<number, string> = { 1: 'bg-slate-100 text-slate-600', 2: 'bg-teal-100 text-teal-700', 3: 'bg-orange-100 text-orange-700' }

export default function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [obra, setObra] = useState<ObraDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'pagamentos' | 'fotos' | 'atividades'>('lancamentos')
  const [fotos, setFotos] = useState<{ id: string; imagemPath: string; descricao: string | null; dataRegistro: string; user: { name: string } }[]>([])
  const [fotoModal, setFotoModal] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [modalLancamento, setModalLancamento] = useState(false)
  const [modalPagamento, setModalPagamento] = useState(false)
  const [saving, setSaving] = useState(false)
  const [funcionarios, setFuncionarios] = useState<{ id: string; nome: string }[]>([])

  // Atividades state
  const [atividades, setAtividades] = useState<AtividadeObra[]>([])
  const [loadingAtiv, setLoadingAtiv] = useState(false)
  const [modalAtividade, setModalAtividade] = useState(false)
  const [editAtividade, setEditAtividade] = useState<AtividadeObra | null>(null)
  const [savingAtiv, setSavingAtiv] = useState(false)

  const { register: regL, handleSubmit: handleL, reset: resetL } = useForm()
  const { register: regP, handleSubmit: handleP, reset: resetP } = useForm()
  const { register: regA, handleSubmit: handleA, reset: resetA } = useForm()

  const loadFotos = () =>
    fetch(`/api/obras/${id}/fotos`).then((r) => r.json()).then(setFotos)

  const loadAtividades = () => {
    setLoadingAtiv(true)
    fetch(`/api/obras/${id}/atividades`)
      .then((r) => r.json())
      .then(setAtividades)
      .finally(() => setLoadingAtiv(false))
  }

  const load = () => {
    fetch(`/api/obras/${id}`)
      .then((r) => r.json())
      .then(setObra)
      .finally(() => setLoading(false))
    loadFotos()
  }

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFoto(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      await fetch(`/api/obras/${id}/fotos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagemBase64: base64, dataRegistro: new Date().toISOString(), descricao: null }),
      })
      loadFotos()
      setUploadingFoto(false)
    }
    reader.readAsDataURL(file)
  }

  const deleteFoto = async (fotoId: string) => {
    if (!confirm('Excluir esta foto?')) return
    await fetch(`/api/obras/${id}/fotos/${fotoId}`, { method: 'DELETE' })
    loadFotos()
  }

  useEffect(() => {
    load()
    loadAtividades()
    fetch('/api/funcionarios')
      .then((r) => r.json())
      .then((data) => setFuncionarios(data.map((f: { id: string; nome: string }) => ({ id: f.id, nome: f.nome }))))
  }, [id])

  const submitLancamento = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      await fetch('/api/lancamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, obraId: id }),
      })
      setModalLancamento(false); resetL(); load()
    } finally { setSaving(false) }
  }

  const submitPagamento = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      await fetch('/api/pagamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, obraId: id }),
      })
      setModalPagamento(false); resetP(); load()
    } finally { setSaving(false) }
  }

  const submitAtividade = async (data: Record<string, unknown>) => {
    setSavingAtiv(true)
    try {
      if (editAtividade) {
        await fetch(`/api/obras/${id}/atividades/${editAtividade.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, peso: Number(data.peso) }),
        })
      } else {
        await fetch(`/api/obras/${id}/atividades`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, peso: Number(data.peso) }),
        })
      }
      setModalAtividade(false); setEditAtividade(null); resetA(); loadAtividades()
    } finally { setSavingAtiv(false) }
  }

  const deleteAtividade = async (atividadeId: string) => {
    if (!confirm('Inativar esta atividade?')) return
    await fetch(`/api/obras/${id}/atividades/${atividadeId}`, { method: 'DELETE' })
    loadAtividades()
  }

  const openNewAtividade = () => {
    setEditAtividade(null)
    resetA({ peso: '2' })
    setModalAtividade(true)
  }

  const openEditAtividade = (a: AtividadeObra) => {
    setEditAtividade(a)
    resetA({ nome: a.nome, descricao: a.descricao ?? '', peso: String(a.peso), unidade: a.unidade ?? '' })
    setModalAtividade(true)
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

  const pesoTotal = atividades.reduce((s, a) => s + a.peso, 0)

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
                  <Pie data={categoriaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {categoriaData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 flex-wrap">
              {([
                ['lancamentos', `Lançamentos (${obra.lancamentos.length})`],
                ['pagamentos', `Pagamentos (${obra.pagamentos.length})`],
                ['fotos', `Fotos (${fotos.length})`],
                ['atividades', `Atividades (${atividades.length})`],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {activeTab === 'fotos' ? (
              <label className="cursor-pointer">
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors ${uploadingFoto ? 'opacity-60 pointer-events-none' : ''}`}>
                  <Camera size={14} /> {uploadingFoto ? 'Enviando...' : 'Adicionar Foto'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} disabled={uploadingFoto} />
              </label>
            ) : activeTab === 'atividades' ? (
              <Button size="sm" onClick={openNewAtividade}>
                <Plus size={14} /> Nova Atividade
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => activeTab === 'lancamentos'
                  ? (resetL({ tipo: 'saida', data: new Date().toISOString().split('T')[0], categoria: 'material' }), setModalLancamento(true))
                  : (resetP({ tipo: 'salario', data: new Date().toISOString().split('T')[0] }), setModalPagamento(true))
                }
              >
                <Plus size={14} /> Novo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {/* ── Lançamentos ── */}
          {activeTab === 'lancamentos' && (
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
          )}

          {/* ── Pagamentos ── */}
          {activeTab === 'pagamentos' && (
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

          {/* ── Fotos ── */}
          {activeTab === 'fotos' && (
            fotos.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma foto registrada</p>
                <p className="text-xs mt-1">Use o botão "Adicionar Foto" acima ou o app mobile</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                {fotos.map((f) => (
                  <div key={f.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer"
                    onClick={() => setFotoModal(f.imagemPath)}>
                    <img src={f.imagemPath} alt={f.descricao ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                      <div className="p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity w-full">
                        {f.descricao && <p className="text-xs font-semibold truncate">{f.descricao}</p>}
                        <p className="text-xs opacity-70">{new Date(f.dataRegistro).toLocaleDateString('pt-BR')} · {f.user.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFoto(f.id) }}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Atividades ── */}
          {activeTab === 'atividades' && (
            loadingAtiv ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : atividades.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma atividade cadastrada</p>
                <p className="text-xs mt-1">Clique em "Nova Atividade" para começar</p>
              </div>
            ) : (
              <div>
                {/* Peso total summary */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4 text-sm">
                  <span className="text-slate-500">{atividades.length} atividade(s)</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-500">Peso total: <strong className="text-slate-700">{pesoTotal}</strong></span>
                  <span className="text-slate-400 text-xs">(usado para calcular evolução ponderada)</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {atividades.map((a, idx) => (
                    <div key={a.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 group">
                      <GripVertical size={14} className="text-slate-300 flex-shrink-0" />
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">{a.nome}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PESO_COLOR[a.peso]}`}>
                            Peso {a.peso} — {PESO_LABEL[a.peso]}
                          </span>
                          {a.unidade && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{a.unidade}</span>
                          )}
                        </div>
                        {a.descricao && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.descricao}</p>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditAtividade(a)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteAtividade(a.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </CardBody>
      </Card>

      {/* Lightbox foto */}
      {fotoModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setFotoModal(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setFotoModal(null)}>
            <X size={32} />
          </button>
          <img src={fotoModal} className="max-w-full max-h-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Modal Lançamento */}
      <Modal isOpen={modalLancamento} onClose={() => setModalLancamento(false)} title="Novo Lançamento">
        <form onSubmit={handleL(submitLancamento)} className="space-y-4">
          <Select label="Tipo *" options={tipoLancOptions} {...regL('tipo', { required: true })} />
          <Input label="Descrição *" {...regL('descricao', { required: true })} placeholder="Ex: Compra de cimento" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor (R$) *" type="number" step="0.01" {...regL('valor', { required: true })} placeholder="0,00" />
            <Input label="Data *" type="date" {...regL('data', { required: true })} />
          </div>
          <Select label="Categoria *" options={CATEGORIAS_LANCAMENTO} {...regL('categoria', { required: true })} />
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

      {/* Modal Atividade */}
      <Modal isOpen={modalAtividade} onClose={() => { setModalAtividade(false); setEditAtividade(null) }} title={editAtividade ? 'Editar Atividade' : 'Nova Atividade'}>
        <form onSubmit={handleA(submitAtividade)} className="space-y-4">
          <Input label="Nome da Atividade *" {...regA('nome', { required: true })} placeholder="Ex: Fundação, Alvenaria, Cobertura..." />
          <Input label="Descrição" {...regA('descricao')} placeholder="Opcional — detalhamento da atividade" />
          <Select label="Peso *" options={PESOS} {...regA('peso', { required: true })} />
          <Input label="Unidade de Medida" {...regA('unidade')} placeholder="Ex: m², m³, un (opcional)" />
          <p className="text-xs text-slate-400">
            O peso é usado para calcular a evolução ponderada no Controle de Atividades semanal.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalAtividade(false); setEditAtividade(null) }}>Cancelar</Button>
            <Button type="submit" loading={savingAtiv}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
