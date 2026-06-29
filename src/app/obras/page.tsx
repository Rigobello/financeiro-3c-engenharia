'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, HardHat } from 'lucide-react'
import { formatCurrency, formatDate, STATUS_OBRA } from '@/lib/utils'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import Link from 'next/link'
import { useForm } from 'react-hook-form'

interface Obra {
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
  _count: { lancamentos: number; pagamentos: number; funcionariosObra: number }
}

const statusOptions = [
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'cancelada', label: 'Cancelada' },
]

export default function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editObra, setEditObra] = useState<Obra | null>(null)

  const { register, handleSubmit, reset, setValue } = useForm()

  const load = () => {
    setLoading(true)
    fetch('/api/obras')
      .then((r) => r.json())
      .then(setObras)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditObra(null)
    reset({ status: 'em_andamento', dataInicio: new Date().toISOString().split('T')[0] })
    setModalOpen(true)
  }

  const openEdit = (obra: Obra) => {
    setEditObra(obra)
    reset({
      nome: obra.nome,
      cliente: obra.cliente,
      endereco: obra.endereco || '',
      cidade: obra.cidade || '',
      dataInicio: obra.dataInicio.split('T')[0],
      dataFim: obra.dataFim ? obra.dataFim.split('T')[0] : '',
      status: obra.status,
      orcamento: obra.orcamento,
      descricao: '',
    })
    setModalOpen(true)
  }

  const onSubmit = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      const url = editObra ? `/api/obras/${editObra.id}` : '/api/obras'
      const method = editObra ? 'PUT' : 'POST'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setModalOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const filtered = obras.filter(
    (o) =>
      o.nome.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Obras</h1>
          <p className="text-sm text-slate-500 mt-1">{obras.length} obra(s) cadastrada(s)</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> Nova Obra
        </Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Buscar por nome ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <HardHat size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma obra encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((obra) => {
            const st = STATUS_OBRA[obra.status] ?? { label: obra.status, color: 'bg-slate-100 text-slate-700' }
            const pct = obra.orcamento > 0 ? Math.min(100, (obra.totalSaidas / obra.orcamento) * 100) : 0
            return (
              <Card key={obra.id} className="hover:shadow-md transition-shadow">
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/obras/${obra.id}`} className="font-semibold text-slate-800 hover:text-orange-600 transition-colors">
                        {obra.nome}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">{obra.cliente}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  {obra.cidade && (
                    <p className="text-xs text-slate-400">{obra.cidade}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Orçamento</p>
                      <p className="font-medium">{formatCurrency(obra.orcamento)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Saldo</p>
                      <p className={`font-medium ${obra.saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(obra.saldo)}
                      </p>
                    </div>
                  </div>

                  {/* Barra de progresso orçamentário */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Gasto do orçamento</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-slate-400">
                      Início: {formatDate(obra.dataInicio)}
                    </p>
                    <button
                      onClick={() => openEdit(obra)}
                      className="text-xs text-orange-500 hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editObra ? 'Editar Obra' : 'Nova Obra'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome da Obra *" {...register('nome', { required: true })} placeholder="Ex: Residencial Vila Nova" />
            </div>
            <div className="col-span-2">
              <Input label="Cliente *" {...register('cliente', { required: true })} placeholder="Nome do cliente" />
            </div>
            <Input label="Endereço" {...register('endereco')} placeholder="Rua, número" />
            <Input label="Cidade" {...register('cidade')} placeholder="Cidade" />
            <Input label="Data de Início *" type="date" {...register('dataInicio', { required: true })} />
            <Input label="Previsão de Término" type="date" {...register('dataFim')} />
            <Input label="Orçamento (R$) *" type="number" step="0.01" {...register('orcamento', { required: true })} placeholder="0,00" />
            <Select label="Status" options={statusOptions} {...register('status')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editObra ? 'Salvar Alterações' : 'Criar Obra'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
