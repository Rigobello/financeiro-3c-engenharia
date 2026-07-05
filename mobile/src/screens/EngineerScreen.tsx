import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, TextInput, Modal, ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { logout, SessionUser } from '../lib/auth'
import { api } from '../lib/api'

interface Solicitacao {
  id: string
  valor: number
  motivo: string
  status: string
  criadoEm: string
  funcionario: { nome: string; cargo: string }
  obra: { nome: string }
  criadoPor: { name: string }
}

interface Props {
  navigation: any
  user: SessionUser
  onLogout: () => void
}

const STATUS_COLOR: Record<string, string> = {
  pendente: '#3BBDB8',
  autorizado: '#22c55e',
  autorizado_outro_valor: '#3b82f6',
  negado: '#ef4444',
}

export default function EngineerScreen({ navigation, user, onLogout }: Props) {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [current, setCurrent] = useState<Solicitacao | null>(null)
  const [acao, setAcao] = useState<'autorizar' | 'autorizar_outro_valor' | 'negar'>('autorizar')
  const [valorOutro, setValorOutro] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.get<Solicitacao[]>('/solicitacoes')
      setSolicitacoes(data)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar solicitações')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const openResponder = (s: Solicitacao) => {
    setCurrent(s)
    setAcao('autorizar')
    setValorOutro('')
    setJustificativa('')
    setModalVisible(true)
  }

  const confirmar = async () => {
    if (!current) return
    if (acao === 'autorizar_outro_valor' && !valorOutro) {
      Alert.alert('Atenção', 'Informe o valor autorizado')
      return
    }

    setSaving(true)
    try {
      await api.put(`/solicitacoes/${current.id}`, {
        acao,
        valorAutorizado: acao === 'autorizar_outro_valor' ? parseFloat(valorOutro) : undefined,
        motivoResposta: justificativa || undefined,
      })
      setModalVisible(false)
      load()
      Alert.alert('Sucesso', 'Resposta enviada com sucesso!')
    } catch (err: any) {
      Alert.alert('Erro', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => { await logout(); onLogout(); navigation.replace('Login') },
      },
    ])
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente')
  const historico = solicitacoes.filter((s) => s.status !== 'pendente')

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Adiantamentos</Text>
          <Text style={styles.headerSub}>{user.name} · Engenheiro</Text>
        </View>
        <View style={styles.headerRight}>
          {pendentes.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendentes.length}</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5165A8" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5165A8" />}
        >
          {/* Pendentes */}
          {pendentes.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>⏳ Aguardando Resposta ({pendentes.length})</Text>
              {pendentes.map((s) => (
                <SolicitacaoCard key={s.id} s={s} fmt={fmt} fmtDate={fmtDate} onResponder={openResponder} showButton />
              ))}
            </>
          )}

          {pendentes.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>Nenhuma solicitação pendente</Text>
            </View>
          )}

          {/* Histórico */}
          {historico.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 24 }]}>📋 Histórico</Text>
              {historico.map((s) => (
                <SolicitacaoCard key={s.id} s={s} fmt={fmt} fmtDate={fmtDate} onResponder={() => {}} showButton={false} />
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Modal de resposta */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Responder Solicitação</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {current && (
            <ScrollView style={styles.modalContent}>
              {/* Detalhes */}
              <View style={styles.detailCard}>
                <Text style={styles.detailName}>{current.funcionario.nome}</Text>
                <Text style={styles.detailCargo}>{current.funcionario.cargo} · {current.obra.nome}</Text>
                <Text style={styles.detailValor}>{fmt(current.valor)}</Text>
                <Text style={styles.detailMotivo}>"{current.motivo}"</Text>
              </View>

              {/* Ações */}
              <Text style={styles.acaoLabel}>Sua Decisão</Text>
              {[
                { value: 'autorizar', label: '✅  Autorizar valor original', color: '#22c55e' },
                { value: 'autorizar_outro_valor', label: '🔄  Autorizar outro valor', color: '#3b82f6' },
                { value: 'negar', label: '❌  Negar solicitação', color: '#ef4444' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setAcao(opt.value as typeof acao)}
                  style={[styles.acaoBtn, acao === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '10' }]}
                >
                  <View style={[styles.radio, acao === opt.value && { borderColor: opt.color }]}>
                    {acao === opt.value && <View style={[styles.radioFill, { backgroundColor: opt.color }]} />}
                  </View>
                  <Text style={[styles.acaoText, acao === opt.value && { color: opt.color, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {acao === 'autorizar_outro_valor' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Valor Autorizado (R$)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={valorOutro}
                    onChangeText={setValorOutro}
                    keyboardType="decimal-pad"
                    placeholder="0,00"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Justificativa (opcional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={justificativa}
                  onChangeText={setJustificativa}
                  placeholder="Deixe um comentário sobre sua decisão..."
                  multiline
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  acao === 'negar' && styles.confirmBtnDanger,
                  saving && styles.confirmBtnDisabled,
                ]}
                onPress={confirmar}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.confirmBtnText}>
                    {acao === 'negar' ? 'Negar Solicitação' : 'Confirmar Autorização'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function SolicitacaoCard({
  s, fmt, fmtDate, onResponder, showButton,
}: {
  s: Solicitacao
  fmt: (v: number) => string
  fmtDate: (d: string) => string
  onResponder: (s: Solicitacao) => void
  showButton: boolean
}) {
  const statusLabels: Record<string, string> = {
    pendente: 'Pendente',
    autorizado: 'Autorizado',
    autorizado_outro_valor: 'Autorizado (outro valor)',
    negado: 'Negado',
  }

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.top}>
        <View style={{ flex: 1 }}>
          <Text style={cardStyles.nome}>{s.funcionario.nome}</Text>
          <Text style={cardStyles.cargo}>{s.funcionario.cargo}</Text>
          <Text style={cardStyles.obra}>{s.obra.nome}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={cardStyles.valor}>{fmt(s.valor)}</Text>
          <View style={[cardStyles.statusBadge, { backgroundColor: STATUS_COLOR[s.status] + '20' }]}>
            <Text style={[cardStyles.statusText, { color: STATUS_COLOR[s.status] }]}>
              {statusLabels[s.status] || s.status}
            </Text>
          </View>
        </View>
      </View>

      <Text style={cardStyles.motivo} numberOfLines={2}>"{s.motivo}"</Text>
      <Text style={cardStyles.date}>{fmtDate(s.criadoEm)} · Criado por {s.criadoPor.name}</Text>

      {showButton && (
        <TouchableOpacity style={cardStyles.btn} onPress={() => onResponder(s)}>
          <Text style={cardStyles.btnText}>Responder</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  nome: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cargo: { fontSize: 12, color: '#64748b' },
  obra: { fontSize: 12, color: '#5165A8', fontWeight: '600', marginTop: 2 },
  valor: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  motivo: { color: '#64748b', fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  date: { color: '#94a3b8', fontSize: 11 },
  btn: {
    backgroundColor: '#5165A8', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 12,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#0f172a',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: '#ef4444', borderRadius: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  logoutBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#94a3b8' },
  modalContent: { flex: 1, padding: 20 },
  detailCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 24 },
  detailName: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  detailCargo: { fontSize: 13, color: '#64748b', marginTop: 2 },
  detailValor: { fontSize: 26, fontWeight: '800', color: '#5165A8', marginTop: 8 },
  detailMotivo: { color: '#64748b', fontSize: 14, fontStyle: 'italic', marginTop: 8 },
  acaoLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 12 },
  acaoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  acaoText: { fontSize: 15, color: '#374151' },
  inputGroup: { marginTop: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  textInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  confirmBtn: {
    backgroundColor: '#22c55e', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32,
  },
  confirmBtnDanger: { backgroundColor: '#ef4444' },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
