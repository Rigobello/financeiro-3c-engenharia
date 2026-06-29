'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Users, Phone, Mail } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'

interface Funcionario {
  id: string
  nome: string
  cpf: string | null
  cargo: string
  salarioBase: number
  status: string
  telefone: string | null
  email: string | null
  totalRecebido: number
  obrasAtivas: number
}

const statusOptions = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
]

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editFuncionario, setEditFuncionario] = useState<Funcionario | null>(null)

  const { register, handleSubmit, reset } = useForm()

  const load = () => {
    setLoading(true)
    fetch('/api/funcionarios')
      .then((r) => r.json())
      .then(setFuncionarios)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditFuncionario(null)
    reset({ status: 'ativo' })
    setModalOpen(true)
  }

  const openEdit = (f: Funcionario) => {
    setEditFuncionario(f)
    reset({
      nome: f.nome,
      cpf: f.cpf || '',
      cargo: f.cargo,
      salarioBase: f.salarioBase,
      status: f.status,
      telefone: f.telefone || '',
      email: f.email || '',
    })
    setModalOpen(true)
  }

  const onSubmit = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      const url = editFuncionario ? `/api/funcionarios/${editFuncionario.id}` : '/api/funcionarios'
      const method = editFuncionario ? 'PUT' : 'POST'
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

  const filtered = funcionarios.filter(
    (f) =>
      f.nome.toLowerCase().includes(search.toLowerCase()) ||
      f.cargo.toLowerCase().includes(search.toLowerCase())
  )

  const ativos = funcionarios.filter((f) => f.status === 'ativo').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Funcionários</h1>
          <p className="text-sm text-slate-500 mt-1">
            {funcionarios.length} cadastrado(s) · {ativos} ativo(s)
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> Novo Funcionário
        </Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Buscar por nome ou cargo..."
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
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum funcionário encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((f) => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-orange-600">
                        {f.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{f.nome}</p>
                      <p className="text-xs text-slate-500">{f.cargo}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      f.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {f.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Salário Base</p>
                    <p className="font-medium">{formatCurrency(f.salarioBase)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Recebido</p>
                    <p className="font-medium text-purple-600">{formatCurrency(f.totalRecebido)}</p>
                  </div>
                </div>

                {f.obrasAtivas > 0 && (
                  <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {f.obrasAtivas} obra(s) ativa(s)
                  </p>
                )}

                <div className="flex flex-col gap-1 text-xs text-slate-400">
                  {f.telefone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={11} /> {f.telefone}
                    </div>
                  )}
                  {f.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={11} /> {f.email}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button onClick={() => openEdit(f)} className="text-xs text-orange-500 hover:underline">
                    Editar
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome Completo *" {...register('nome', { required: true })} placeholder="Nome do funcionário" />
            </div>
            <Input label="CPF" {...register('cpf')} placeholder="000.000.000-00" />
            <Input label="Cargo *" {...register('cargo', { required: true })} placeholder="Ex: Pedreiro, Mestre de Obras" />
            <Input label="Salário Base (R$) *" type="number" step="0.01" {...register('salarioBase', { required: true })} placeholder="0,00" />
            <Select label="Status" options={statusOptions} {...register('status')} />
            <Input label="Telefone" {...register('telefone')} placeholder="(00) 00000-0000" />
            <Input label="E-mail" type="email" {...register('email')} placeholder="email@exemplo.com" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editFuncionario ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
