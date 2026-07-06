import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, ActivityIndicator, Modal, TextInput, Alert,
  ScrollView, RefreshControl,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser, isAdmin, isEngenheiro } from '../lib/auth'

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

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendente: { label: 'Pendente', color: '#d97706', bg: '#fef3c7' },
  autorizado: { label: 'Autorizado', color: '#16a34a', bg: '#dcfce7' },
  autorizado_outro_valor: { label: 'Aut. (outro valor)', color: '#2563eb', bg: '#dbeafe' },
  negado: { label: 'Negado', color: '#dc2626', bg: '#fee2e2' },
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')
const today = () => new Date().toISOString().slice(0, 10)

export default function SolicitacoesScreen({ navigation, user }: Props) {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')

  // Nova solicitação
  const [modalNova, setModalNova] = useState(false)
  const [novaFuncId, setNovaFuncId] = useState('')
  const [novaObraId, setNovaObraId] = useState('')
  const [novaValor, setNovaValor] = useState('')
  const [novaMotivo, setNovaMotivo] = useState('')
  const [savingNova, setSavingNova] = useState(false)
  const [pickFuncNova, setPickFuncNova] = useState(false)
  const [pickObraNova, setPickObraNova] = useState(false)

  // Responder
  const [modalResponder, setModalResponder] = useState(false)
  const [current, setCurrent] = useState<Solicitacao | null>(null)
  const [acao, setAcao] = useState<'autorizar' | 'autorizar_outro_valor' | 'negar'>('autorizar')
  const [valorOutro, setValorOutro] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [savingResp, setSavingResp] = useState(false)

  const canApprove = isAdmin(user) || isEngenheiro(user)
  const canCreate = true // all users can create

  const load = useCallback(async () => {
    try {
      const [sols, obs, funcs] = await Promise.all([
        api.get<Solicitacao[]>('/solicitacoes'),
        api.get<Obra[]>('/obras'),
        api.get<Funcionario[]>('/funcionarios'),
      ])
      setSolicitacoes(sols)
      setObras(obs)
      setFuncionarios(funcs.filter((f: any) => f.status === 'ativo'))
    } catch { }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const criarSolicitacao = async () => {
    if (!novaFuncId || !novaObraId || !novaValor || !novaMotivo) {
      Alert.alert('Atenção', 'Preencha todos os campos'); return
    }
    setSavingNova(true)
    try {
      await api.post('/solicitacoes', {
        funcionarioId: novaFuncId,
        obraId: novaObraId,
        valor: parseFloat(novaValor.replace(',', '.')),
        motivo: novaMotivo,
      })
      setModalNova(false)
      setNovaFuncId(''); setNovaObraId(''); setNovaValor(''); setNovaMotivo('')
      load()
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSavingNova(false) }
  }

  const openResponder = (s: Solicitacao) => {
    setCurrent(s); setAcao('autorizar'); setValorOutro(''); setJustificativa('')
    setModalResponder(true)
  }

  const responder = async () => {
    if (!current) return
    if (acao === 'autorizar_outro_valor' && !valorOutro) { Alert.alert('Atenção', 'Informe o valor autorizado'); return }
    setSavingResp(true)
    try {
      await api.put(`/solicitacoes/${current.id}`, {
        acao,
        valorAutorizado: acao === 'autorizar_outro_valor' ? parseFloat(valorOutro.replace(',', '.')) : undefined,
        motivoResposta: justificativa || undefined,
      })
      setModalResponder(false)
      load()
      Alert.alert('Sucesso', 'Resposta enviada!')
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSavingResp(false) }
  }

  const filtered = solicitacoes.filter((s) => !filtroStatus || s.status === filtroStatus)
  const pendentes = solicitacoes.filter((s) => s.status === 'pendente').length

  const selectedFunc = funcionarios.find((f) => f.id === novaFuncId)
  const selectedObra = obras.find((o) => o.id === novaObraId)

  const filtros = [
    { value: '', label: 'Todas' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'autorizado', label: 'Autorizado' },
    { value: 'autorizado_outro_valor', label: 'Aut. Outro' },
    { value: 'negado', label: 'Negado' },
  ]

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Adiantamentos</Text>
          <Text style={s.headerSub}>{solicitacoes.length} solicitação(ões) · {pendentes} pendente(s)</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalNova(true)}>
          <Text style={s.addBtnText}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtroScroll} contentContainerStyle={s.filtroContent}>
        {filtros.map((f) => (
          <TouchableOpacity key={f.value} style={[s.filtroBtn, filtroStatus === f.value && s.filtroBtnActive]} onPress={() => setFiltroStatus(f.value)}>
            <Text style={[s.filtroBtnText, filtroStatus === f.value && s.filtroBtnTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#5165A8" />}
          ListEmptyComponent={
            <View style={s.empty}><Text style={s.emptyIcon}>💰</Text><Text style={s.emptyText}>Nenhuma solicitação encontrada</Text></View>
          }
          renderItem={({ item: s }) => {
            const cfg = STATUS_CONFIG[s.status] || { label: s.status, color: '#475569', bg: '#f1f5f9' }
            return (
              <View style={sc.card}>
                <View style={sc.top}>
                  <View style={{ flex: 1 }}>
                    <Text style={sc.nome}>{s.funcionario.nome}</Text>
                    <Text style={sc.cargo}>{s.funcionario.cargo}</Text>
                    <Text style={sc.obra}>{s.obra.nome}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={sc.valor}>{fmt(s.valor)}</Text>
                    <View style={[sc.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[sc.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>
                <Text style={sc.motivo} numberOfLines={2}>"{s.motivo}"</Text>
                {s.motivoResposta && (
                  <Text style={sc.resp} numberOfLines={2}>Resp: {s.motivoResposta}</Text>
                )}
                {s.valorAutorizado && s.valorAutorizado !== s.valor && (
                  <Text style={sc.valorAut}>Valor autorizado: {fmt(s.valorAutorizado)}</Text>
                )}
                <View style={sc.footer}>
                  <Text style={sc.date}>{fmtDate(s.criadoEm)} · por {s.criadoPor.name}</Text>
                  {canApprove && s.status === 'pendente' && (
                    <TouchableOpacity style={sc.btn} onPress={() => openResponder(s)}>
                      <Text style={sc.btnText}>Responder</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}

      {/* Modal Nova Solicitação */}
      <Modal visible={modalNova} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Nova Solicitação de Adiantamento</Text>
            <TouchableOpacity onPress={() => setModalNova(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={s.label}>Funcionário *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickFuncNova(true)}>
              <Text style={[s.pickerText, !novaFuncId && s.pickerPh]}>
                {selectedFunc ? `${selectedFunc.nome} — ${selectedFunc.cargo}` : 'Selecione...'}
              </Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Obra *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickObraNova(true)}>
              <Text style={[s.pickerText, !novaObraId && s.pickerPh]}>
                {selectedObra ? selectedObra.nome : 'Selecione...'}
              </Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Valor Solicitado (R$) *</Text>
            <TextInput style={s.input} value={novaValor} onChangeText={setNovaValor} keyboardType="decimal-pad" placeholder="0,00" />

            <Text style={s.label}>Motivo *</Text>
            <TextInput style={[s.input, { height: 90, textAlignVertical: 'top' }]} value={novaMotivo} onChangeText={setNovaMotivo} multiline placeholder="Descreva o motivo do adiantamento..." />

            <TouchableOpacity style={[s.confirmBtn, savingNova && s.confirmBtnDisabled]} onPress={criarSolicitacao} disabled={savingNova}>
              {savingNova ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Enviar para Aprovação</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Funcionário (nova) */}
      <Modal visible={pickFuncNova} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Funcionário</Text><TouchableOpacity onPress={() => setPickFuncNova(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{funcionarios.map((f) => (
            <TouchableOpacity key={f.id} style={s.pickItem} onPress={() => { setNovaFuncId(f.id); setPickFuncNova(false) }}>
              <Text style={s.pickTitle}>{f.nome}</Text>
              <Text style={s.pickSub}>{f.cargo}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Obra (nova) */}
      <Modal visible={pickObraNova} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Obra</Text><TouchableOpacity onPress={() => setPickObraNova(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{obras.map((o) => (
            <TouchableOpacity key={o.id} style={s.pickItem} onPress={() => { setNovaObraId(o.id); setPickObraNova(false) }}>
              <Text style={s.pickTitle}>{o.nome}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Responder */}
      <Modal visible={modalResponder} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Responder Solicitação</Text>
            <TouchableOpacity onPress={() => setModalResponder(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          {current && (
            <ScrollView style={s.modalContent}>
              <View style={sr.detailCard}>
                <Text style={sr.detailName}>{current.funcionario.nome}</Text>
                <Text style={sr.detailCargo}>{current.funcionario.cargo} · {current.obra.nome}</Text>
                <Text style={sr.detailValor}>{fmt(current.valor)}</Text>
                <Text style={sr.detailMotivo}>"{current.motivo}"</Text>
              </View>

              <Text style={s.label}>Decisão *</Text>
              {[
                { value: 'autorizar', label: '✅  Autorizar valor original', color: '#22c55e' },
                { value: 'autorizar_outro_valor', label: '🔄  Autorizar outro valor', color: '#3b82f6' },
                { value: 'negar', label: '❌  Negar solicitação', color: '#ef4444' },
              ].map((opt) => (
                <TouchableOpacity key={opt.value}
                  onPress={() => setAcao(opt.value as typeof acao)}
                  style={[sr.acaoBtn, acao === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '18' }]}>
                  <View style={[sr.radio, acao === opt.value && { borderColor: opt.color }]}>
                    {acao === opt.value && <View style={[sr.radioFill, { backgroundColor: opt.color }]} />}
                  </View>
                  <Text style={[sr.acaoText, acao === opt.value && { color: opt.color, fontWeight: '700' }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}

              {acao === 'autorizar_outro_valor' && (
                <>
                  <Text style={s.label}>Valor Autorizado (R$) *</Text>
                  <TextInput style={s.input} value={valorOutro} onChangeText={setValorOutro} keyboardType="decimal-pad" placeholder="0,00" />
                </>
              )}

              <Text style={s.label}>Justificativa (opcional)</Text>
              <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={justificativa} onChangeText={setJustificativa} multiline placeholder="Deixe um comentário..." />

              <TouchableOpacity
                style={[s.confirmBtn, acao === 'negar' && { backgroundColor: '#ef4444' }, savingResp && s.confirmBtnDisabled]}
                onPress={responder} disabled={savingResp}>
                {savingResp ? <ActivityIndicator color="#fff" /> : (
                  <Text style={s.confirmBtnText}>{acao === 'negar' ? 'Negar Solicitação' : 'Confirmar Autorização'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const sc = StyleSheet.create({
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, elevation: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  nome: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cargo: { fontSize: 12, color: '#64748b' },
  obra: { fontSize: 12, color: '#5165A8', fontWeight: '600', marginTop: 2 },
  valor: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  motivo: { color: '#64748b', fontSize: 13, fontStyle: 'italic', marginBottom: 6 },
  resp: { color: '#94a3b8', fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  valorAut: { color: '#22c55e', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  date: { color: '#94a3b8', fontSize: 11 },
  btn: { backgroundColor: '#5165A8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
})

const sr = StyleSheet.create({
  detailCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, marginBottom: 16 },
  detailName: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  detailCargo: { fontSize: 13, color: '#64748b', marginTop: 2 },
  detailValor: { fontSize: 24, fontWeight: '800', color: '#5165A8', marginTop: 8 },
  detailMotivo: { color: '#64748b', fontSize: 13, fontStyle: 'italic', marginTop: 6 },
  acaoBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  acaoText: { fontSize: 15, color: '#374151' },
})

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0f172a' },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 11 },
  addBtn: { backgroundColor: '#5165A8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filtroScroll: { maxHeight: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filtroContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filtroBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  filtroBtnActive: { backgroundColor: '#5165A8', borderColor: '#5165A8' },
  filtroBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filtroBtnTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', flex: 1 },
  modalClose: { fontSize: 20, color: '#94a3b8' },
  modalContent: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc' },
  picker: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  pickerText: { fontSize: 15, color: '#1e293b', flex: 1 },
  pickerPh: { color: '#94a3b8' },
  pickerChev: { color: '#94a3b8', fontSize: 16 },
  confirmBtn: { backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pickItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  pickSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
})
