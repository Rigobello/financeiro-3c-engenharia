'use client'

import { useEffect, useState } from 'react'
import { Plus, TrendingUp, TrendingDown, Filter, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate, CATEGORIAS_LANCAMENTO } from '@/lib/utils'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'

interface Lancamento {
  id: string
  tipo: string
  valor: number
  descricao: string
  categoria: string
  data: string
  obraId: string
  obra: { nome: string }
}

interface Obra {
  id: string
  nome: string
}

export default function CaixaPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset } = useForm()

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/lancamentos').then((r) => r.json()),
      fetch('/api/obras').then((r) => r.json()),
    ])
      .then(([lancs, obs]) => {
        setLancamentos(lancs)
        setObras(obs)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setModalOpen(false)
      reset()
      load()
    } finally {
      setSaving(false)
    }
  }

  const deleteLancamento = async (id: string) => {
    if (!confirm('Excluir este lançamento?')) return
    await fetch(`/api/lancamentos/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = lancamentos.filter((l) => {
    if (filtroObra && l.obraId !== filtroObra) return false
    if (filtroTipo && l.tipo !== filtroTipo) return false
    return true
  })

  const totalEntradas = filtered.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const totalSaidas = filtered.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)

  const obraOptions = [
    { value: '', label: 'Todas as obras' },
    ...obras.map((o) => ({ value: o.id, label: o.nome })),
  ]
  const tipoOptions = [
    { value: '', label: 'Todos os tipos' },
    { value: 'entrada', label: 'Entradas' },
    { value: 'saida', label: 'Saídas' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Caixa</h1>
          <p className="text-sm text-slate-500 mt-1">Todos os lançamentos financeiros</p>
        </div>
        <Button
          onClick={() => {
            reset({ tipo: 'saida', data: new Date().toISOString().split('T')[0], categoria: 'material' })
            setModalOpen(true)
          }}
        >
          <Plus size={16} /> Novo Lançamento
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Entradas</p>
              <p className="font-bold text-green-600">{formatCurrency(totalEntradas)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-400 flex items-center justify-center">
              <TrendingDown size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Saídas</p>
              <p className="font-bold text-red-500">{formatCurrency(totalSaidas)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totalEntradas - totalSaidas >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}>
              <Filter size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Saldo Filtrado</p>
              <p className={`font-bold ${totalEntradas - totalSaidas >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                {formatCurrency(totalEntradas - totalSaidas)}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <select
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={filtroObra}
          onChange={(e) => setFiltroObra(e.target.value)}
        >
          {obraOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          {tipoOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">Nenhum lançamento encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Data</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Descrição</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Obra</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Categoria</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Valor</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatDate(l.data)}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{l.descricao}</td>
                      <td className="px-5 py-3 text-slate-500">{l.obra.nome}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {CATEGORIAS_LANCAMENTO.find((c) => c.value === l.categoria)?.label ?? l.categoria}
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                        {l.tipo === 'entrada' ? '+' : '-'} {formatCurrency(l.valor)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => deleteLancamento(l.id)} className="text-slate-300 hover:text-red-500 transition-colors">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Lançamento">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Obra *"
            options={obras.map((o) => ({ value: o.id, label: o.nome }))}
            {...register('obraId', { required: true })}
          />
          <Select
            label="Tipo *"
            options={[
              { value: 'saida', label: 'Saída (Despesa)' },
              { value: 'entrada', label: 'Entrada (Receita)' },
            ]}
            {...register('tipo', { required: true })}
          />
          <Input label="Descrição *" {...register('descricao', { required: true })} placeholder="Ex: Compra de areia" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor (R$) *" type="number" step="0.01" {...register('valor', { required: true })} placeholder="0,00" />
            <Input label="Data *" type="date" {...register('data', { required: true })} />
          </div>
          <Select label="Categoria *" options={CATEGORIAS_LANCAMENTO} {...register('categoria', { required: true })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
