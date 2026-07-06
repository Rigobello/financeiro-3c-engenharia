import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, Modal, ActivityIndicator, TextInput, FlatList,
  ScrollView, RefreshControl,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser, isAdmin } from '../lib/auth'

interface Funcionario { id: string; nome: string; cargo: string }
interface Obra { id: string; nome: string; status: string }
interface RegistroPonto {
  id: string
  tipo: string
  dataHora: string
  observacao: string | null
  status: string
  alertaImpar: boolean
  funcionario: { id: string; nome: string; cargo: string }
  obra: { nome: string } | null
}

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  em_aberto: { label: 'Em Aberto', color: '#475569', bg: '#f1f5f9' },
  aguarda_pagamento: { label: 'Aguardando Pgto', color: '#d97706', bg: '#fef3c7' },
  pago: { label: 'Pago', color: '#16a34a', bg: '#dcfce7' },
}
const STATUS_NEXT: Record<string, string> = {
  em_aberto: 'aguarda_pagamento',
  aguarda_pagamento: 'pago',
  pago: 'em_aberto',
}
const TIPO_LABEL: Record<string, string> = {
  E1: 'E1', S1: 'S1', E2: 'E2', S2: 'S2',
  entrada: 'Ent.', saida: 'Saí.',
}

function fmtHora(d: string) { return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
function fmtDataLabel(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
}
function dayKey(d: string) { return d.slice(0, 10) }

// Group pontos by day → by employee
type DayGroup = {
  date: string
  employees: {
    funcId: string
    funcNome: string
    funcCargo: string
    pontos: RegistroPonto[]
    hasAlerta: boolean
    commonStatus: string
  }[]
}

function groupPontos(pontos: RegistroPonto[]): DayGroup[] {
  const byDay: Record<string, RegistroPonto[]> = {}
  for (const p of pontos) {
    const k = dayKey(p.dataHora)
    if (!byDay[k]) byDay[k] = []
    byDay[k].push(p)
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, recs]) => {
      const byEmp: Record<string, RegistroPonto[]> = {}
      for (const r of recs) {
        const k = r.funcionario.id
        if (!byEmp[k]) byEmp[k] = []
        byEmp[k].push(r)
      }
      return {
        date,
        employees: Object.entries(byEmp).map(([funcId, pts]) => {
          pts.sort((a, b) => a.dataHora.localeCompare(b.dataHora))
          return {
            funcId,
            funcNome: pts[0].funcionario.nome,
            funcCargo: pts[0].funcionario.cargo,
            pontos: pts,
            hasAlerta: pts.some((p) => p.alertaImpar),
            commonStatus: pts[0].status,
          }
        })
      }
    })
}

function assignLabel(pontos: RegistroPonto[]): string[] {
  // Map tipo to E1/S1/E2/S2 by order
  const labels: string[] = []
  let entradas = 0; let saidas = 0
  for (const p of pontos) {
    const t = p.tipo.toLowerCase()
    if (t === 'e1') { labels.push('E1') }
    else if (t === 's1') { labels.push('S1') }
    else if (t === 'e2') { labels.push('E2') }
    else if (t === 's2') { labels.push('S2') }
    else if (t === 'entrada') { entradas++; labels.push(entradas === 1 ? 'E1' : 'E2') }
    else if (t === 'saida') { saidas++; labels.push(saidas === 1 ? 'S1' : 'S2') }
    else { labels.push(p.tipo.toUpperCase()) }
  }
  return labels
}

export default function PontoScreen({ navigation, user }: Props) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [pontos, setPontos] = useState<RegistroPonto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7))

  // Form
  const [selFunc, setSelFunc] = useState<Funcionario | null>(null)
  const [selObra, setSelObra] = useState<Obra | null>(null)
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada')
  const [obs, setObs] = useState('')
  const [pickFunc, setPickFunc] = useState(false)
  const [pickObra, setPickObra] = useState(false)

  const load = useCallback(async () => {
    try {
      const [funcs, obs, pts] = await Promise.all([
        api.get<Funcionario[]>('/funcionarios'),
        api.get<Obra[]>('/obras'),
        api.get<RegistroPonto[]>('/ponto'),
      ])
      setFuncionarios(funcs.filter((f: any) => f.status === 'ativo'))
      setObras(obs.filter((o: any) => o.status === 'em_andamento'))
      setPontos(pts)
    } catch { }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const shiftMes = (delta: number) => {
    const [y, m] = filtroMes.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setFiltroMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const filtered = pontos.filter((p) => p.dataHora.startsWith(filtroMes))
  const groups = groupPontos(filtered)

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
      await load()
      Alert.alert('Registrado!', `${tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${selFunc.nome} registrada.`)
    } catch (err: any) { Alert.alert('Erro', err.message) }
    finally { setSaving(false) }
  }

  const changeStatus = async (pontoId: string, currentStatus: string) => {
    if (!isAdmin(user)) return
    const next = STATUS_NEXT[currentStatus] || 'em_aberto'
    const cfg = STATUS_CONFIG[next]
    Alert.alert('Alterar Status', `Mudar para "${cfg?.label || next}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', onPress: async () => {
          try {
            await api.put(`/ponto/${pontoId}`, { status: next })
            load()
          } catch (e: any) { Alert.alert('Erro', e.message) }
        }
      }
    ])
  }

  const openModal = () => {
    setSelFunc(null); setSelObra(null); setTipo('entrada'); setObs('')
    setModalOpen(true)
  }

  const pendentes = pontos.filter((p) => p.status === 'em_aberto' || p.status === 'aguarda_pagamento').length

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Registro de Ponto</Text>
          <Text style={s.headerSub}>{pontos.length} registros · {pendentes} em aberto</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openModal}>
          <Text style={s.addBtnText}>+ Registrar</Text>
        </TouchableOpacity>
      </View>

      {/* Month navigator */}
      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => shiftMes(-1)} style={s.navArrow}><Text style={s.navArrowText}>◀</Text></TouchableOpacity>
        <Text style={s.monthLabel}>{filtroMes}</Text>
        <TouchableOpacity onPress={() => shiftMes(+1)} style={s.navArrow}><Text style={s.navArrowText}>▶</Text></TouchableOpacity>
        <TouchableOpacity style={s.todayBtn} onPress={() => setFiltroMes(new Date().toISOString().slice(0, 7))}>
          <Text style={s.todayBtnText}>Hoje</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.date}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#5165A8" />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>⏰</Text>
              <Text style={s.emptyText}>Nenhum registro neste mês</Text>
            </View>
          }
          renderItem={({ item: group }) => (
            <View style={s.daySection}>
              <Text style={s.dayLabel}>{fmtDataLabel(group.date)}</Text>
              {group.employees.map((emp) => {
                const labels = assignLabel(emp.pontos)
                const statusCfg = STATUS_CONFIG[emp.commonStatus] || STATUS_CONFIG.em_aberto
                return (
                  <View key={emp.funcId} style={s.empCard}>
                    <View style={s.empTop}>
                      <View style={s.empAvatar}>
                        <Text style={s.empAvatarText}>{emp.funcNome.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={s.empNameRow}>
                          <Text style={s.empNome}>{emp.funcNome}</Text>
                          {emp.hasAlerta && <Text style={s.alertIcon}>⚠️</Text>}
                        </View>
                        <Text style={s.empCargo}>{emp.funcCargo}</Text>
                      </View>
                      <TouchableOpacity
                        style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}
                        onPress={() => changeStatus(emp.pontos[0].id, emp.commonStatus)}
                        disabled={!isAdmin(user)}>
                        <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                        {isAdmin(user) && <Text style={[s.statusChev, { color: statusCfg.color }]}> ▾</Text>}
                      </TouchableOpacity>
                    </View>
                    <View style={s.pontosRow}>
                      {emp.pontos.map((p, i) => (
                        <View key={p.id} style={[s.pontoChip, { backgroundColor: labels[i].startsWith('E') ? '#dcfce7' : '#fee2e2' }]}>
                          <Text style={[s.pontoLabel, { color: labels[i].startsWith('E') ? '#16a34a' : '#dc2626' }]}>{labels[i]}</Text>
                          <Text style={[s.pontoHora, { color: labels[i].startsWith('E') ? '#16a34a' : '#dc2626' }]}>{fmtHora(p.dataHora)}</Text>
                          {p.observacao && <Text style={s.pontoObs} numberOfLines={1}>{p.observacao}</Text>}
                        </View>
                      ))}
                      {/* Placeholder chips for missing slots */}
                      {emp.pontos.length < 4 && Array(4 - emp.pontos.length).fill(0).map((_, i) => (
                        <View key={'ph' + i} style={[s.pontoChip, { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' }]}>
                          <Text style={s.pontoPlaceholder}>{['E1', 'S1', 'E2', 'S2'][emp.pontos.length + i]}</Text>
                        </View>
                      ))}
                    </View>
                    {emp.pontos[0].obra && (
                      <Text style={s.obraName}>{emp.pontos[0].obra!.nome}</Text>
                    )}
                  </View>
                )
              })}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}

      {/* Modal Registrar */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Registrar Ponto</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={s.label}>Tipo</Text>
            <View style={s.tipoRow}>
              {(['entrada', 'saida'] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => setTipo(t)}
                  style={[s.tipoBtn, tipo === t && (t === 'entrada' ? s.tipoBtnEntrada : s.tipoBtnSaida)]}>
                  <Text style={[s.tipoBtnText, tipo === t && s.tipoBtnTextActive]}>
                    {t === 'entrada' ? '▼ Entrada' : '▲ Saída'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Funcionário *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickFunc(true)}>
              <Text style={[s.pickerText, !selFunc && s.pickerPh]}>
                {selFunc ? `${selFunc.nome} — ${selFunc.cargo}` : 'Selecione...'}
              </Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Obra (opcional)</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickObra(true)}>
              <Text style={[s.pickerText, !selObra && s.pickerPh]}>{selObra ? selObra.nome : '— sem obra —'}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>
            {selObra && (
              <TouchableOpacity onPress={() => setSelObra(null)}>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Remover obra</Text>
              </TouchableOpacity>
            )}

            <Text style={s.label}>Observação (opcional)</Text>
            <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]} value={obs} onChangeText={setObs}
              placeholder="Ex: chegou atrasado" multiline />

            <TouchableOpacity style={[s.confirmBtn, saving && s.confirmBtnDisabled]} onPress={registrar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Registrar Ponto</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Funcionário */}
      <Modal visible={pickFunc} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Funcionário</Text><TouchableOpacity onPress={() => setPickFunc(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{funcionarios.map((f) => (
            <TouchableOpacity key={f.id} style={s.pickItem} onPress={() => { setSelFunc(f); setPickFunc(false) }}>
              <Text style={s.pickTitle}>{f.nome}</Text><Text style={s.pickSub}>{f.cargo}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Obra */}
      <Modal visible={pickObra} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Obra</Text><TouchableOpacity onPress={() => setPickObra(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{obras.map((o) => (
            <TouchableOpacity key={o.id} style={s.pickItem} onPress={() => { setSelObra(o); setPickObra(false) }}>
              <Text style={s.pickTitle}>{o.nome}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0f172a' },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 12 },
  addBtn: { backgroundColor: '#5165A8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  navArrow: { padding: 8 },
  navArrowText: { color: '#5165A8', fontSize: 16, fontWeight: '700' },
  monthLabel: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#1e293b' },
  todayBtn: { backgroundColor: '#eef1f8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  todayBtnText: { color: '#5165A8', fontSize: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  daySection: { paddingHorizontal: 16, paddingTop: 16 },
  dayLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
  empCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 1 },
  empTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  empAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eef1f8', alignItems: 'center', justifyContent: 'center' },
  empAvatarText: { color: '#5165A8', fontSize: 16, fontWeight: '800' },
  empNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  empNome: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  alertIcon: { fontSize: 14 },
  empCargo: { fontSize: 12, color: '#64748b' },
  statusBadge: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusChev: { fontSize: 10 },
  pontosRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pontoChip: { padding: 8, borderRadius: 10, minWidth: 62, alignItems: 'center' },
  pontoLabel: { fontSize: 11, fontWeight: '800' },
  pontoHora: { fontSize: 13, fontWeight: '700' },
  pontoObs: { fontSize: 10, color: '#94a3b8', marginTop: 2, maxWidth: 60 },
  pontoPlaceholder: { fontSize: 12, color: '#cbd5e1', fontWeight: '700' },
  obraName: { fontSize: 11, color: '#5165A8', marginTop: 8, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#94a3b8' },
  modalContent: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  tipoRow: { flexDirection: 'row', gap: 12 },
  tipoBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center' },
  tipoBtnEntrada: { borderColor: '#22c55e', backgroundColor: '#dcfce7' },
  tipoBtnSaida: { borderColor: '#ef4444', backgroundColor: '#fee2e2' },
  tipoBtnText: { fontSize: 15, fontWeight: '700', color: '#94a3b8' },
  tipoBtnTextActive: { color: '#1e293b' },
  picker: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  pickerText: { fontSize: 15, color: '#1e293b', flex: 1 },
  pickerPh: { color: '#94a3b8' },
  pickerChev: { color: '#94a3b8', fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc' },
  confirmBtn: { backgroundColor: '#5165A8', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pickItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  pickSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
})
