'use client'

import { useEffect, useState } from 'react'
import { Plus, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'

interface Solicitacao {
  id: string
  valor: number
  motivo: string
  status: string
  valorAutorizado: number | null
  motivoResposta: string | null
  criadoEm: string
  respondidoEm: string | null
  funcionario: { nome: string; cargo: string }
  obra: { nome: string }
  criadoPor: { name: string }
  aprovadoPor: { name: string } | null
}

interface Obra { id: string; nome: string }
interface Funcionario { id: string; nome: string; cargo: string }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  autorizado: { label: 'Autorizado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  autorizado_outro_valor: { label: 'Autorizado (outro valor)', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  negado: { label: 'Negado', color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default function SolicitacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNova, setModalNova] = useState(false)
  const [modalResponder, setModalResponder] = useState(false)
  const [solicitacaoAtual, setSolicitacaoAtual] = useState<Solicitacao | null>(null)
  const [saving, setSaving] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [session, setSession] = useState<{ grupos: string[] } | null>(null)

  const { register: regN, handleSubmit: handleN, reset: resetN } = useForm()
  const { register: regR, handleSubmit: handleR, reset: resetR, watch } = useForm()
  const acaoSelecionada = watch('acao')

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/solicitacoes').then((r) => r.json()),
      fetch('/api/obras').then((r) => r.json()),
      fetch('/api/funcionarios').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ])
      .then(([sols, obs, funcs, me]) => {
        setSolicitacoes(sols)
        setObras(obs)
        setFuncionarios(funcs)
        setSession(me)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const criarSolicitacao = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setModalNova(false)
      resetN()
      load()
    } finally {
      setSaving(false)
    }
  }

  const responderSolicitacao = async (data: Record<string, unknown>) => {
    if (!solicitacaoAtual) return
    setSaving(true)
    try {
      await fetch(`/api/solicitacoes/${solicitacaoAtual.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setModalResponder(false)
      resetR()
      setSolicitacaoAtual(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  const isAdmin = session?.grupos.includes('Administrador') ?? false
  const isEngenheiro = session?.grupos.includes('Engenheiro') ?? false

  const filtered = solicitacoes.filter((s) =>
    filtroStatus ? s.status === filtroStatus : true
  )

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitações de Adiantamento</h1>
          <p className="text-sm text-slate-500 mt-1">
            {solicitacoes.length} solicitação(ões) · {pendentes} pendente(s)
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetN(); setModalNova(true) }}>
            <Plus size={16} /> Nova Solicitação
          </Button>
        )}
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        {['', 'pendente', 'autorizado', 'autorizado_outro_valor', 'negado'].map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filtroStatus === s
                ? 'bg-orange-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === '' ? 'Todas' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'bg-slate-100 text-slate-600', icon: Clock }
            const Icon = cfg.icon
            return (
              <Card key={s.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon size={11} /> {cfg.label}
                        </span>
                        <span className="text-xs text-slate-400">{formatDate(s.criadoEm)}</span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Funcionário</p>
                          <p className="font-medium">{s.funcionario.nome}</p>
                          <p className="text-xs text-slate-500">{s.funcionario.cargo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Obra</p>
                          <p className="font-medium">{s.obra.nome}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Valor Solicitado</p>
                          <p className="font-bold text-orange-600">{formatCurrency(s.valor)}</p>
                        </div>
                        {s.valorAutorizado && (
                          <div>
                            <p className="text-xs text-slate-400">Valor Autorizado</p>
                            <p className="font-bold text-green-600">{formatCurrency(s.valorAutorizado)}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Motivo</p>
                        <p className="text-sm text-slate-700">{s.motivo}</p>
                      </div>

                      {s.motivoResposta && (
                        <div className="bg-slate-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-slate-400">Resposta de {s.aprovadoPor?.name}</p>
                          <p className="text-sm text-slate-700">{s.motivoResposta}</p>
                        </div>
                      )}

                      <p className="text-xs text-slate-400">Criado por: {s.criadoPor.name}</p>
                    </div>

                    {/* Botão responder */}
                    {(isEngenheiro || isAdmin) && s.status === 'pendente' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSolicitacaoAtual(s)
                          resetR({ acao: 'autorizar' })
                          setModalResponder(true)
                        }}
                      >
                        Responder
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal nova solicitação */}
      <Modal isOpen={modalNova} onClose={() => setModalNova(false)} title="Nova Solicitação de Adiantamento" size="md">
        <form onSubmit={handleN(criarSolicitacao)} className="space-y-4">
          <Select
            label="Funcionário *"
            options={funcionarios.map((f) => ({ value: f.id, label: `${f.nome} - ${f.cargo}` }))}
            {...regN('funcionarioId', { required: true })}
          />
          <Select
            label="Obra *"
            options={obras.map((o) => ({ value: o.id, label: o.nome }))}
            {...regN('obraId', { required: true })}
          />
          <Input label="Valor Solicitado (R$) *" type="number" step="0.01" {...regN('valor', { required: true })} placeholder="0,00" />
          <Textarea label="Motivo *" {...regN('motivo', { required: true })} placeholder="Descreva o motivo do adiantamento..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalNova(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Enviar para Aprovação</Button>
          </div>
        </form>
      </Modal>

      {/* Modal responder */}
      <Modal isOpen={modalResponder} onClose={() => setModalResponder(false)} title="Responder Solicitação" size="md">
        {solicitacaoAtual && (
          <form onSubmit={handleR(responderSolicitacao)} className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
              <p><span className="text-slate-500">Funcionário:</span> <strong>{solicitacaoAtual.funcionario.nome}</strong></p>
              <p><span className="text-slate-500">Valor:</span> <strong className="text-orange-600">{formatCurrency(solicitacaoAtual.valor)}</strong></p>
              <p><span className="text-slate-500">Motivo:</span> {solicitacaoAtual.motivo}</p>
            </div>

            <Select
              label="Decisão *"
              options={[
                { value: 'autorizar', label: '✅ Autorizar (valor original)' },
                { value: 'autorizar_outro_valor', label: '🔄 Autorizar outro valor' },
                { value: 'negar', label: '❌ Negar' },
              ]}
              {...regR('acao', { required: true })}
            />

            {acaoSelecionada === 'autorizar_outro_valor' && (
              <Input label="Valor Autorizado (R$) *" type="number" step="0.01" {...regR('valorAutorizado', { required: true })} placeholder="0,00" />
            )}

            <Textarea label="Justificativa (opcional)" {...regR('motivoResposta')} placeholder="Deixe um comentário sobre sua decisão..." />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalResponder(false)}>Cancelar</Button>
              <Button
                type="submit"
                loading={saving}
                variant={acaoSelecionada === 'negar' ? 'danger' : 'primary'}
              >
                Confirmar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
