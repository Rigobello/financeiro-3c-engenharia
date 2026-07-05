import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Modal, ActivityIndicator, TextInput, Platform,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser } from '../lib/auth'

interface Funcionario { id: string; nome: string; cargo: string }
interface Obra { id: string; nome: string; status: string }
interface RegistroPonto {
  id: string; tipo: string; dataHora: string; observacao: string | null
  funcionario: { nome: string; cargo: string }
  obra: { nome: string } | null
}

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

export default function PontoScreen({ navigation, user }: Props) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [pontos, setPontos] = useState<RegistroPonto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  // Form state
  const [selFunc, setSelFunc] = useState<Funcionario | null>(null)
  const [selObra, setSelObra] = useState<Obra | null>(null)
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada')
  const [obs, setObs] = useState('')
  const [pickFunc, setPickFunc] = useState(false)
  const [pickObra, setPickObra] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Funcionario[]>('/funcionarios'),
      api.get<Obra[]>('/obras'),
      api.get<RegistroPonto[]>('/ponto'),
    ]).then(([funcs, obs, pts]) => {
      setFuncionarios(funcs.filter((f: any) => f.status === 'ativo'))
      setObras(obs.filter((o: any) => o.status === 'em_andamento'))
      setPontos(pts.slice(0, 30))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const openModal = () => {
    setSelFunc(null); setSelObra(null); setTipo('entrada'); setObs('')
    setModalOpen(true)
  }

  const registrar = async () => {
    if (!selFunc) { Alert.alert('Atenção', 'Selecione o funcionário'); return }
    setSaving(true)
    try {
      await api.post('/ponto', {
        funcionarioId: selFunc.id,
        obraId: selObra?.id || null,
        tipo,
        dataHora: new Date().toISOString(),
        observacao: obs || null,
      })
      setModalOpen(false)
      const pts = await api.get<RegistroPonto[]>('/ponto')
      setPontos(pts.slice(0, 30))
      Alert.alert('✅ Registrado!', `${tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${selFunc.nome} registrada.`)
    } catch (err: any) {
      Alert.alert('Erro', err.message)
    } finally {
      setSaving(false)
    }
  }

  const fmtHora = (d: string) =>
    new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const fmtData = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Registro de Ponto</Text>
          <Text style={s.headerSub}>{user.name}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openModal}>
          <Text style={s.addBtnText}>+ Registrar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          <Text style={s.sectionLabel}>Últimos registros</Text>
          {pontos.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>⏰</Text>
              <Text style={s.emptyText}>Nenhum registro ainda</Text>
            </View>
          )}
          {pontos.map((p) => (
            <View key={p.id} style={s.card}>
              <View style={[s.badge, { backgroundColor: p.tipo === 'entrada' ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={[s.badgeText, { color: p.tipo === 'entrada' ? '#16a34a' : '#dc2626' }]}>
                  {p.tipo === 'entrada' ? '▼ Entrada' : '▲ Saída'}
                </Text>
              </View>
              <View style={s.cardBody}>
                <Text style={s.funcNome}>{p.funcionario.nome}</Text>
                <Text style={s.funcCargo}>{p.funcionario.cargo}{p.obra ? ` · ${p.obra.nome}` : ''}</Text>
              </View>
              <View style={s.timeBox}>
                <Text style={s.timeHora}>{fmtHora(p.dataHora)}</Text>
                <Text style={s.timeData}>{fmtData(p.dataHora)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Registrar Ponto</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalContent}>
            {/* Tipo */}
            <Text style={s.label}>Tipo</Text>
            <View style={s.tipoRow}>
              {(['entrada', 'saida'] as const).map((t) => (
                <TouchableOpacity
                  key={t} onPress={() => setTipo(t)}
                  style={[s.tipoBtn, tipo === t && (t === 'entrada' ? s.tipoBtnEntrada : s.tipoBtnSaida)]}>
                  <Text style={[s.tipoBtnText, tipo === t && s.tipoBtnTextActive]}>
                    {t === 'entrada' ? '▼ Entrada' : '▲ Saída'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Funcionário */}
            <Text style={s.label}>Funcionário *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickFunc(true)}>
              <Text style={[s.pickerText, !selFunc && s.pickerPlaceholder]}>
                {selFunc ? `${selFunc.nome} — ${selFunc.cargo}` : 'Selecione...'}
              </Text>
              <Text style={s.pickerChevron}>▾</Text>
            </TouchableOpacity>

            {/* Obra */}
            <Text style={s.label}>Obra (opcional)</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickObra(true)}>
              <Text style={[s.pickerText, !selObra && s.pickerPlaceholder]}>
                {selObra ? selObra.nome : '— sem obra —'}
              </Text>
              <Text style={s.pickerChevron}>▾</Text>
            </TouchableOpacity>
            {selObra && (
              <TouchableOpacity onPress={() => setSelObra(null)}>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Remover obra selecionada</Text>
              </TouchableOpacity>
            )}

            {/* Obs */}
            <Text style={s.label}>Observação (opcional)</Text>
            <TextInput
              style={s.textInput} value={obs} onChangeText={setObs}
              placeholder="Ex: chegou atrasado" multiline />

            <TouchableOpacity
              style={[s.confirmBtn, saving && s.confirmBtnDisabled]}
              onPress={registrar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Registrar Ponto</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Funcionário */}
      <Modal visible={pickFunc} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Selecionar Funcionário</Text>
            <TouchableOpacity onPress={() => setPickFunc(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {funcionarios.map((f) => (
              <TouchableOpacity key={f.id} style={s.pickItem}
                onPress={() => { setSelFunc(f); setPickFunc(false) }}>
                <Text style={s.pickItemTitle}>{f.nome}</Text>
                <Text style={s.pickItemSub}>{f.cargo}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Obra */}
      <Modal visible={pickObra} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Selecionar Obra</Text>
            <TouchableOpacity onPress={() => setPickObra(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {obras.map((o) => (
              <TouchableOpacity key={o.id} style={s.pickItem}
                onPress={() => { setSelObra(o); setPickObra(false) }}>
                <Text style={s.pickItemTitle}>{o.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0f172a',
  },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 12 },
  addBtn: { backgroundColor: '#5165A8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  sectionLabel: { color: '#64748b', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  cardBody: { flex: 1 },
  funcNome: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  funcCargo: { fontSize: 12, color: '#64748b', marginTop: 1 },
  timeBox: { alignItems: 'flex-end' },
  timeHora: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'], color: '#1e293b' },
  timeData: { fontSize: 11, color: '#94a3b8' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#94a3b8' },
  modalContent: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  tipoRow: { flexDirection: 'row', gap: 12 },
  tipoBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center',
  },
  tipoBtnEntrada: { borderColor: '#22c55e', backgroundColor: '#dcfce7' },
  tipoBtnSaida: { borderColor: '#ef4444', backgroundColor: '#fee2e2' },
  tipoBtnText: { fontSize: 15, fontWeight: '700', color: '#94a3b8' },
  tipoBtnTextActive: { color: '#1e293b' },
  picker: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  pickerText: { fontSize: 15, color: '#1e293b' },
  pickerPlaceholder: { color: '#94a3b8' },
  pickerChevron: { color: '#94a3b8', fontSize: 16 },
  textInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b',
    minHeight: 60, textAlignVertical: 'top',
  },
  confirmBtn: {
    backgroundColor: '#5165A8', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pickItem: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  pickItemTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  pickItemSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
})
