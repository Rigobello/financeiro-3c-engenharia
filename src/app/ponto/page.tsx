'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Clock, ChevronDown } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import { formatDate } from '@/lib/utils'

interface Funcionario { id: string; nome: string; cargo: string }
interface Obra { id: string; nome: string }
interface RegistroPonto {
  id: string
  tipo: string
  dataHora: string
  observacao: string | null
  funcionario: { nome: string; cargo: string }
  obra: { nome: string } | null
  registradoPor: { name: string }
}

export default function PontoPage() {
  const [pontos, setPontos] = useState<RegistroPonto[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('')
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroInicio, setFiltroInicio] = useState('')
  const [filtroFim, setFiltroFim] = useState('')

  const { register, handleSubmit, reset } = useForm()

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

  useEffect(() => { load() }, [])

  const onSubmit = async (data: any) => {
    setSaving(true)
    try {
      await fetch('/api/ponto', {
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

  const deletePonto = async (id: string) => {
    if (!confirm('Remover este registro?')) return
    await fetch(`/api/ponto/${id}`, { method: 'DELETE' })
    load()
  }

  const tipoLabel: Record<string, string> = { entrada: 'Entrada', saida: 'Saída' }
  const tipoCor: Record<string, string> = { entrada: 'text-emerald-600 bg-emerald-50', saida: 'text-red-600 bg-red-50' }

  // Agrupado por dia
  const grouped: Record<string, RegistroPonto[]> = {}
  for (const p of pontos) {
    const day = p.dataHora.slice(0, 10)
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(p)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registro de Ponto</h1>
          <p className="text-slate-500 text-sm mt-1">{pontos.length} registro{pontos.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { reset({ dataHora: new Date().toISOString().slice(0, 16) }); setModalOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" /> Registrar Ponto
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Funcionário</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={filtroFuncionario}
                onChange={(e) => setFiltroFuncionario(e.target.value)}
              >
                <option value="">Todos</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Obra</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={filtroObra}
                onChange={(e) => setFiltroObra(e.target.value)}
              >
                <option value="">Todas</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">De</label>
              <input
                type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Até</label>
              <input
                type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)}
              />
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

      {/* Lista por dia */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : pontos.length === 0 ? (
        <Card><CardBody className="py-12 text-center text-slate-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          Nenhum registro encontrado
        </CardBody></Card>
      ) : (
        Object.entries(grouped).map(([day, registros]) => (
          <Card key={day}>
            <CardHeader>
              <h3 className="font-semibold text-slate-700">
                {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                <span className="ml-2 text-sm font-normal text-slate-400">({registros.length} registro{registros.length !== 1 ? 's' : ''})</span>
              </h3>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100">
                {registros.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${tipoCor[p.tipo]}`}>
                        {tipoLabel[p.tipo] ?? p.tipo}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">{p.funcionario.nome}</p>
                        <p className="text-xs text-slate-500">
                          {p.funcionario.cargo}
                          {p.obra && <> · <span className="text-orange-600">{p.obra.nome}</span></>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono font-semibold text-slate-700">
                          {new Date(p.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {p.observacao && <p className="text-xs text-slate-400 max-w-[200px] truncate">{p.observacao}</p>}
                        <p className="text-xs text-slate-400">por {p.registradoPor.name}</p>
                      </div>
                      <button onClick={() => deletePonto(p.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))
      )}

      {/* Modal */}
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
    </div>
  )
}
