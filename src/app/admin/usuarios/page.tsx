'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Shield, User } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'

interface Grupo { id: string; nome: string }
interface Usuario {
  id: string
  username: string
  name: string
  status: string
  grupos: Grupo[]
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editUser, setEditUser] = useState<Usuario | null>(null)
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([])

  const { register, handleSubmit, reset } = useForm()

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/usuarios').then((r) => r.json()),
      fetch('/api/grupos').then((r) => r.json()),
    ])
      .then(([users, grps]) => {
        setUsuarios(users)
        setGrupos(grps)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditUser(null)
    setSelectedGrupos([])
    reset({ status: 'ativo', password: '' })
    setModalOpen(true)
  }

  const openEdit = (u: Usuario) => {
    setEditUser(u)
    setSelectedGrupos(u.grupos.map((g) => g.id))
    reset({ username: u.username, name: u.name, status: u.status, password: '' })
    setModalOpen(true)
  }

  const toggleGrupo = (id: string) => {
    setSelectedGrupos((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    )
  }

  const onSubmit = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      const url = editUser ? `/api/usuarios/${editUser.id}` : '/api/usuarios'
      const method = editUser ? 'PUT' : 'POST'
      const body: Record<string, unknown> = { ...data, grupoIds: selectedGrupos }
      if (editUser && !body.password) delete body.password

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setModalOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Excluir usuário "${name}"?`)) return
    await fetch(`/api/usuarios/${id}`, { method: 'DELETE' })
    load()
  }

  const grupoColors: Record<string, string> = {
    Administrador: 'bg-red-100 text-red-700',
    Engenheiro: 'bg-blue-100 text-blue-700',
    Usuário: 'bg-green-100 text-green-700',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuários do Sistema</h1>
          <p className="text-sm text-slate-500 mt-1">{usuarios.length} usuário(s) cadastrado(s)</p>
        </div>
        <Button onClick={openNew}>
          <Plus size={16} /> Novo Usuário
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {usuarios.map((u) => (
            <Card key={u.id}>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <User size={18} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-500">@{u.username}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {u.grupos.map((g) => (
                    <span key={g.id} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${grupoColors[g.nome] || 'bg-slate-100 text-slate-600'}`}>
                      <Shield size={10} /> {g.nome}
                    </span>
                  ))}
                  {u.grupos.length === 0 && (
                    <span className="text-xs text-slate-400">Nenhum grupo</span>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => openEdit(u)} className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                    <Edit2 size={12} /> Editar
                  </button>
                  <button onClick={() => deleteUser(u.id, u.name)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                    <Trash2 size={12} /> Excluir
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
        title={editUser ? 'Editar Usuário' : 'Novo Usuário'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nome Completo *" {...register('name', { required: true })} placeholder="Nome do usuário" />
          <Input label="Login (usuário) *" {...register('username', { required: true })} placeholder="username" />
          <Input
            label={editUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
            type="password"
            {...register('password', { required: !editUser })}
            placeholder="••••••••"
          />
          <Select
            label="Status"
            options={[
              { value: 'ativo', label: 'Ativo' },
              { value: 'inativo', label: 'Inativo' },
            ]}
            {...register('status')}
          />

          {/* Grupos */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Grupos de Acesso</p>
            <div className="space-y-2">
              {grupos.map((g) => (
                <label key={g.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedGrupos.includes(g.id)}
                    onChange={() => toggleGrupo(g.id)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{g.nome}</p>
                    <p className="text-xs text-slate-500">
                      {g.nome === 'Administrador' && 'Acesso total ao sistema'}
                      {g.nome === 'Engenheiro' && 'Autoriza solicitações de adiantamento'}
                      {g.nome === 'Usuário' && 'Apenas envio de fotos e nome das obras'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>
              {editUser ? 'Salvar' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
