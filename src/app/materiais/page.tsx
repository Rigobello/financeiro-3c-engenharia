'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Package, ArrowRight, Camera, History } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'

interface Material {
  id: string
  nome: string
  descricao: string | null
  codigo: string | null
  categoria: string | null
  unidade: string
  quantidadeTotal: number
  fotoCaminho: string | null
  locais: { local: string; nome: string; quantidade: number }[]
  movimentacoes: Movimentacao[]
}

interface Movimentacao {
  id: string
  quantidade: number
  data: string
  observacao: string | null
  obraOrigem: { id?: string; nome: string } | null
  obraDestino: { id?: string; nome: string } | null
  registradoPor: { name: string }
}

interface Obra { id: string; nome: string; status: string }

const CATEGORIAS = ['Elétrica', 'Hidráulica', 'Ferramentas', 'Equipamentos', 'EPI', 'Cimento/Massa', 'Outro']

export default function MateriaisPage() {
  const [materiais, setMateriais] = useState<Material[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [modalMaterial, setModalMaterial] = useState(false)
  const [modalMovimento, setModalMovimento] = useState(false)
  const [modalHistorico, setModalHistorico] = useState(false)
  const [editMaterial, setEditMaterial] = useState<Material | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [historico, setHistorico] = useState<Movimentacao[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoBase64, setFotoBase64] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const formMat = useForm()
  const formMov = useForm()

  const load = async () => {
    setLoading(true)
    const [mats, obs] = await Promise.all([
      fetch('/api/materiais').then((r) => r.json()),
      obras.length ? Promise.resolve(obras) : fetch('/api/obras').then((r) => r.json()),
    ])
    setMateriais(mats)
    setObras(obs)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setFotoPreview(result)
      setFotoBase64(result)
    }
    reader.readAsDataURL(file)
  }

  const openEdit = (m?: Material) => {
    setEditMaterial(m ?? null)
    setFotoPreview(m?.fotoCaminho ? `${m.fotoCaminho}?t=${Date.now()}` : null)
    setFotoBase64(null)
    formMat.reset(m ? {
      nome: m.nome, descricao: m.descricao, codigo: m.codigo,
      categoria: m.categoria, unidade: m.unidade, quantidadeTotal: m.quantidadeTotal,
    } : { unidade: 'un', quantidadeTotal: 1 })
    setModalMaterial(true)
  }

  const saveMaterial = async (data: any) => {
    setSaving(true)
    try {
      if (editMaterial) {
        await fetch(`/api/materiais/${editMaterial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, ...(fotoBase64 ? { fotoBase64 } : {}) }),
        })
      } else {
        const res = await fetch('/api/materiais', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (fotoBase64 && res.ok) {
          const created = await res.json()
          if (created?.id) {
            await fetch(`/api/materiais/${created.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...data, fotoBase64 }),
            })
          }
        }
      }
      setModalMaterial(false)
      load()
    } finally { setSaving(false) }
  }

  const openMovimento = (m: Material) => {
    setSelectedMaterial(m)
    // Pre-fill origin with last known destination
    const lastDest = m.movimentacoes[0]?.obraDestino?.id ?? ''
    formMov.reset({
      materialId: m.id,
      quantidade: 1,
      data: new Date().toISOString().slice(0, 10),
      obraOrigemId: lastDest,
    })
    setModalMovimento(true)
  }

  const saveMovimento = async (data: any) => {
    setSaving(true)
    try {
      const res = await fetch('/api/movimentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, materialId: selectedMaterial?.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error)
        return
      }
      setModalMovimento(false)
      load()
    } finally { setSaving(false) }
  }

  const openHistorico = async (m: Material) => {
    setSelectedMaterial(m)
    setHistorico([])
    setModalHistorico(true)
    setLoadingHistorico(true)
    try {
      const data = await fetch(`/api/materiais/${m.id}/movimentacoes`).then((r) => r.json())
      setHistorico(data)
    } finally {
      setLoadingHistorico(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controle de Material</h1>
          <p className="text-slate-500 text-sm mt-1">{materiais.length} material(is) cadastrado(s)</p>
        </div>
        <Button onClick={() => openEdit()}>
          <Plus className="w-4 h-4 mr-2" /> Novo Material
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : materiais.length === 0 ? (
        <Card><CardBody className="py-12 text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          Nenhum material cadastrado
        </CardBody></Card>
      ) : (
        <div className="space-y-3">
          {materiais.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <CardBody className="p-0">
                <div className="flex items-start justify-between p-4 cursor-pointer hover:bg-slate-50"
                  onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {m.fotoCaminho ? (
                        <img
                          src={`${m.fotoCaminho}?t=${m.id}`}
                          alt={m.nome}
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 flex-shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-800">{m.nome}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {m.codigo && <span className="font-mono bg-slate-100 px-1 rounded">{m.codigo}</span>}
                          {m.categoria && <span>{m.categoria}</span>}
                          <span className="font-semibold">{m.quantidadeTotal} {m.unidade} total</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {m.locais.map((l) => (
                        <span key={l.local} className={`text-xs px-2 py-1 rounded-full font-semibold
                          ${l.local === 'deposito' ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                          {l.nome}: {l.quantidade} {m.unidade}
                        </span>
                      ))}
                      {m.locais.length === 0 && (
                        <span className="text-xs text-slate-400">Sem estoque registrado</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); openMovimento(m) }}>
                      <ArrowRight className="w-4 h-4 mr-1" /> Movimentar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openHistorico(m) }}
                      title="Histórico completo">
                      <History className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(m) }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Histórico expandido (últimas movimentações da listagem) */}
                {expandedId === m.id && m.movimentacoes.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 pb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase py-3">Últimas Movimentações</p>
                    <div className="space-y-2">
                      {m.movimentacoes.map((mov) => (
                        <div key={mov.id} className="flex items-center gap-3 text-sm bg-white rounded-lg px-3 py-2">
                          <span className="text-slate-500 text-xs font-mono">
                            {new Date(mov.data).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-slate-400">{mov.obraOrigem?.nome ?? 'Depósito'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-orange-600 font-semibold">{mov.obraDestino?.nome ?? 'Depósito'}</span>
                          <span className="ml-auto font-bold text-slate-700">{mov.quantidade} {m.unidade}</span>
                          {mov.observacao && (
                            <span className="text-slate-400 text-xs max-w-[150px] truncate">{mov.observacao}</span>
                          )}
                          <span className="text-slate-400 text-xs">{mov.registradoPor.name}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openHistorico(m) }}
                      className="mt-3 text-xs text-orange-500 hover:underline"
                    >
                      Ver histórico completo →
                    </button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Material */}
      <Modal isOpen={modalMaterial} onClose={() => setModalMaterial(false)}
        title={editMaterial ? 'Editar Material' : 'Novo Material'}>
        <form onSubmit={formMat.handleSubmit(saveMaterial)} className="space-y-4">
          {/* Foto */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-orange-400 transition-colors flex-shrink-0"
              onClick={() => fileRef.current?.click()}
            >
              {fotoPreview ? (
                <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Foto do material</p>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="mt-1 text-xs text-orange-500 hover:underline">
                {fotoPreview ? 'Alterar foto' : 'Adicionar foto'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Nome *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2"
                {...formMat.register('nome', { required: true })} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Código</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 font-mono"
                placeholder="Ex: FUR-001" {...formMat.register('codigo')} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Categoria</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2"
                {...formMat.register('categoria')}>
                <option value="">Selecione...</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Unidade</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2"
                {...formMat.register('unidade')}>
                {['un', 'kg', 'm', 'm²', 'm³', 'L', 'cx', 'pc', 'par', 'jogo'].map((u) =>
                  <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Qtd. Total</label>
              <input type="number" min={1} className="w-full border border-slate-200 rounded-lg px-3 py-2"
                {...formMat.register('quantidadeTotal', { required: true, min: 1 })} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Descrição</label>
              <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 resize-none"
                {...formMat.register('descricao')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalMaterial(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Movimentação */}
      <Modal isOpen={modalMovimento} onClose={() => setModalMovimento(false)}
        title={`Movimentar: ${selectedMaterial?.nome}`}>
        <form onSubmit={formMov.handleSubmit(saveMovimento)} className="space-y-4">
          {selectedMaterial && selectedMaterial.locais.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-3 text-sm">
              {selectedMaterial.locais.map((l) => (
                <span key={l.local} className="mr-3 font-semibold text-orange-700">
                  {l.nome}: {l.quantidade} {selectedMaterial.unidade}
                </span>
              ))}
            </div>
          )}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Origem</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2"
              {...formMov.register('obraOrigemId')}>
              <option value="">Depósito</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Destino</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2"
              {...formMov.register('obraDestinoId')}>
              <option value="">Depósito</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Quantidade *</label>
              <input type="number" min={1} className="w-full border border-slate-200 rounded-lg px-3 py-2"
                {...formMov.register('quantidade', { required: true, min: 1 })} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Data *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2"
                {...formMov.register('data', { required: true })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Observação</label>
            <input type="text" placeholder="Opcional" className="w-full border border-slate-200 rounded-lg px-3 py-2"
              {...formMov.register('observacao')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalMovimento(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Registrando...' : 'Confirmar Movimentação'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Histórico Completo */}
      <Modal isOpen={modalHistorico} onClose={() => setModalHistorico(false)}
        title={`Histórico: ${selectedMaterial?.nome}`} size="lg">
        {loadingHistorico ? (
          <div className="py-12 text-center text-slate-400">Carregando histórico...</div>
        ) : historico.length === 0 ? (
          <div className="py-12 text-center text-slate-400">Nenhuma movimentação registrada.</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-slate-400 mb-3">{historico.length} movimentação(ões)</p>
            {historico.map((mov, i) => (
              <div key={mov.id} className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                <span className="text-slate-500 text-xs font-mono w-20 flex-shrink-0">
                  {new Date(mov.data).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-slate-600 flex-shrink-0">{mov.obraOrigem?.nome ?? 'Depósito'}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-orange-600 font-semibold flex-shrink-0">{mov.obraDestino?.nome ?? 'Depósito'}</span>
                <span className="ml-auto font-bold text-slate-700 flex-shrink-0">
                  {mov.quantidade} {selectedMaterial?.unidade}
                </span>
                {mov.observacao && (
                  <span className="text-slate-400 text-xs max-w-[120px] truncate">{mov.observacao}</span>
                )}
                <span className="text-slate-400 text-xs flex-shrink-0">{mov.registradoPor.name}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
