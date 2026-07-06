import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, ActivityIndicator, Modal, TextInput, Alert,
  ScrollView, RefreshControl,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser, isAdmin } from '../lib/auth'

interface Pagamento {
  id: string; valor: number; tipo: string; data: string; descricao: string | null
  obraId: string; funcionarioId: string
  funcionario: { nome: string; cargo: string }
  obra: { nome: string }
}
interface Obra { id: string; nome: string }
interface Funcionario { id: string; nome: string }

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

const TIPOS_PAG = [
  { value: 'salario', label: 'Salário' },
  { value: 'adiantamento', label: 'Adiantamento' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'hora_extra', label: 'Hora Extra' },
  { value: 'outros', label: 'Outros' },
]

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (d: string) => new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
const today = () => new Date().toISOString().slice(0, 10)

export default function PagamentosScreen({ navigation, user }: Props) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'lista' | 'mensal'>('lista')

  // Filters
  const [filtroFunc, setFiltroFunc] = useState('')
  const [filtroObra, setFiltroObra] = useState('')

  // New pagamento modal
  const [modalOpen, setModalOpen] = useState(false)
  const [pagFuncId, setPagFuncId] = useState('')
  const [pagObraId, setPagObraId] = useState('')
  const [pagTipo, setPagTipo] = useState('salario')
  const [pagValor, setPagValor] = useState('')
  const [pagData, setPagData] = useState(today())
  const [pagDesc, setPagDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // Pickers
  const [pickFunc, setPickFunc] = useState(false)
  const [pickObra, setPickObra] = useState(false)
  const [pickFuncFilter, setPickFuncFilter] = useState(false)
  const [pickObraFilter, setPickObraFilter] = useState(false)
  const [pickTipo, setPickTipo] = useState(false)

  const load = useCallback(async () => {
    try {
      const [pags, obs, funcs] = await Promise.all([
        api.get<Pagamento[]>('/pagamentos'),
        api.get<Obra[]>('/obras'),
        api.get<Funcionario[]>('/funcionarios'),
      ])
      setPagamentos(pags)
      setObras(obs)
      setFuncionarios(funcs)
    } catch { }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const openModal = () => {
    setPagFuncId(''); setPagObraId(''); setPagTipo('salario')
    setPagValor(''); setPagData(today()); setPagDesc('')
    setModalOpen(true)
  }

  const salvar = async () => {
    if (!pagFuncId || !pagObraId || !pagValor) {
      Alert.alert('Atenção', 'Preencha funcionário, obra e valor'); return
    }
    setSaving(true)
    try {
      await api.post('/pagamentos', {
        funcionarioId: pagFuncId, obraId: pagObraId, tipo: pagTipo,
        valor: parseFloat(pagValor.replace(',', '.')),
        data: pagData, descricao: pagDesc || null,
      })
      setModalOpen(false)
      load()
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSaving(false) }
  }

  const deletePagamento = (id: string) => {
    Alert.alert('Excluir', 'Excluir este pagamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try { await api.del(`/pagamentos/${id}`); load() } catch {}
      }},
    ])
  }

  const filtered = pagamentos.filter((p) => {
    if (filtroFunc && p.funcionarioId !== filtroFunc) return false
    if (filtroObra && p.obraId !== filtroObra) return false
    return true
  })

  const totalFiltrado = filtered.reduce((s, p) => s + p.valor, 0)

  // Monthly data
  const porMes = pagamentos.reduce<Record<string, { total: number; count: number }>>((acc, p) => {
    const d = new Date(p.data)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!acc[key]) acc[key] = { total: 0, count: 0 }
    acc[key].total += p.valor; acc[key].count++
    return acc
  }, {})
  const mesesOrdenados = Object.entries(porMes).sort(([a], [b]) => b.localeCompare(a)).slice(0, 12)

  const selectedFunc = funcionarios.find((f) => f.id === pagFuncId)
  const selectedObra = obras.find((o) => o.id === pagObraId)
  const selectedTipo = TIPOS_PAG.find((t) => t.value === pagTipo)
  const filterFuncName = funcionarios.find((f) => f.id === filtroFunc)?.nome || 'Todos funcionários'
  const filterObraName = obras.find((o) => o.id === filtroObra)?.nome || 'Todas as obras'

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Pagamentos</Text>
          <Text style={s.headerSub}>{pagamentos.length} pagamento(s) · {fmt(pagamentos.reduce((s, p) => s + p.valor, 0))}</Text>
        </View>
        {isAdmin(user) && (
          <TouchableOpacity style={s.addBtn} onPress={openModal}>
            <Text style={s.addBtnText}>+ Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {(['lista', 'mensal'] as const).map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'lista' ? 'Lista' : 'Mensal'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : tab === 'lista' ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#5165A8" />}
          ListHeaderComponent={
            <View>
              {/* Filters */}
              <View style={s.filterRow}>
                <TouchableOpacity style={s.filterBtn} onPress={() => setPickFuncFilter(true)}>
                  <Text style={s.filterBtnText} numberOfLines={1}>{filterFuncName}</Text>
                  <Text style={s.filterChev}>▾</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.filterBtn} onPress={() => setPickObraFilter(true)}>
                  <Text style={s.filterBtnText} numberOfLines={1}>{filterObraName}</Text>
                  <Text style={s.filterChev}>▾</Text>
                </TouchableOpacity>
              </View>
              {(filtroFunc || filtroObra) && (
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total filtrado:</Text>
                  <Text style={s.totalValue}>{fmt(totalFiltrado)}</Text>
                  <TouchableOpacity onPress={() => { setFiltroFunc(''); setFiltroObra('') }} style={s.clearBtn}>
                    <Text style={s.clearBtnText}>Limpar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}><Text style={s.emptyIcon}>💳</Text><Text style={s.emptyText}>Nenhum pagamento encontrado</Text></View>
          }
          renderItem={({ item: p }) => (
            <TouchableOpacity style={s.card} onLongPress={() => isAdmin(user) && deletePagamento(p.id)}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{p.funcionario.nome}</Text>
                <Text style={s.cardSub}>{p.funcionario.cargo}</Text>
                <Text style={s.cardMeta}>{p.obra.nome} · {TIPOS_PAG.find((t) => t.value === p.tipo)?.label || p.tipo} · {fmtDate(p.data)}</Text>
              </View>
              <Text style={s.cardValue}>{fmt(p.valor)}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#5165A8" />}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {mesesOrdenados.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyIcon}>📅</Text><Text style={s.emptyText}>Nenhum dado mensal</Text></View>
          ) : mesesOrdenados.map(([key, data]) => {
            const [year, month] = key.split('-')
            return (
              <View key={key} style={s.mesCard}>
                <View style={s.mesHeader}>
                  <Text style={s.mesLabel}>{MESES[Number(month) - 1]}/{year}</Text>
                  <Text style={s.mesCount}>{data.count} pagamento(s)</Text>
                </View>
                <Text style={s.mesTotal}>{fmt(data.total)}</Text>
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* Modal novo pagamento */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Novo Pagamento</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={s.label}>Funcionário *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickFunc(true)}>
              <Text style={[s.pickerText, !pagFuncId && s.pickerPh]}>
                {selectedFunc ? selectedFunc.nome : 'Selecione...'}
              </Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Obra *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickObra(true)}>
              <Text style={[s.pickerText, !pagObraId && s.pickerPh]}>
                {selectedObra ? selectedObra.nome : 'Selecione...'}
              </Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Tipo *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickTipo(true)}>
              <Text style={s.pickerText}>{selectedTipo?.label || 'Salário'}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Valor (R$) *</Text>
            <TextInput style={s.input} value={pagValor} onChangeText={setPagValor} keyboardType="decimal-pad" placeholder="0,00" />

            <Text style={s.label}>Data * (AAAA-MM-DD)</Text>
            <TextInput style={s.input} value={pagData} onChangeText={setPagData} placeholder="2024-01-15" />

            <Text style={s.label}>Observação</Text>
            <TextInput style={s.input} value={pagDesc} onChangeText={setPagDesc} placeholder="Opcional" />

            <TouchableOpacity style={[s.confirmBtn, saving && s.confirmBtnDisabled]} onPress={salvar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Salvar Pagamento</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Funcionário (form) */}
      <Modal visible={pickFunc} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Funcionário</Text><TouchableOpacity onPress={() => setPickFunc(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{funcionarios.map((f) => (
            <TouchableOpacity key={f.id} style={s.pickItem} onPress={() => { setPagFuncId(f.id); setPickFunc(false) }}>
              <Text style={s.pickTitle}>{f.nome}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Obra (form) */}
      <Modal visible={pickObra} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Obra</Text><TouchableOpacity onPress={() => setPickObra(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{obras.map((o) => (
            <TouchableOpacity key={o.id} style={s.pickItem} onPress={() => { setPagObraId(o.id); setPickObra(false) }}>
              <Text style={s.pickTitle}>{o.nome}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Tipo */}
      <Modal visible={pickTipo} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Tipo</Text><TouchableOpacity onPress={() => setPickTipo(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{TIPOS_PAG.map((t) => (
            <TouchableOpacity key={t.value} style={s.pickItem} onPress={() => { setPagTipo(t.value); setPickTipo(false) }}>
              <Text style={[s.pickTitle, pagTipo === t.value && { color: '#8b5cf6', fontWeight: '800' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Funcionário (filter) */}
      <Modal visible={pickFuncFilter} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Filtrar Funcionário</Text><TouchableOpacity onPress={() => setPickFuncFilter(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <TouchableOpacity style={s.pickItem} onPress={() => { setFiltroFunc(''); setPickFuncFilter(false) }}>
              <Text style={[s.pickTitle, !filtroFunc && { color: '#5165A8' }]}>Todos os funcionários</Text>
            </TouchableOpacity>
            {funcionarios.map((f) => (
              <TouchableOpacity key={f.id} style={s.pickItem} onPress={() => { setFiltroFunc(f.id); setPickFuncFilter(false) }}>
                <Text style={[s.pickTitle, filtroFunc === f.id && { color: '#5165A8' }]}>{f.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Obra (filter) */}
      <Modal visible={pickObraFilter} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Filtrar Obra</Text><TouchableOpacity onPress={() => setPickObraFilter(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <TouchableOpacity style={s.pickItem} onPress={() => { setFiltroObra(''); setPickObraFilter(false) }}>
              <Text style={[s.pickTitle, !filtroObra && { color: '#5165A8' }]}>Todas as obras</Text>
            </TouchableOpacity>
            {obras.map((o) => (
              <TouchableOpacity key={o.id} style={s.pickItem} onPress={() => { setFiltroObra(o.id); setPickObraFilter(false) }}>
                <Text style={[s.pickTitle, filtroObra === o.id && { color: '#5165A8' }]}>{o.nome}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0f172a' },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 11 },
  addBtn: { backgroundColor: '#8b5cf6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#5165A8' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#5165A8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterBtn: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  filterBtnText: { fontSize: 12, color: '#475569', flex: 1 },
  filterChev: { color: '#94a3b8', fontSize: 14 },
  totalRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#eef1f8', gap: 8 },
  totalLabel: { fontSize: 13, color: '#5165A8', fontWeight: '600' },
  totalValue: { fontSize: 14, color: '#5165A8', fontWeight: '800' },
  clearBtn: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#5165A8', borderRadius: 8 },
  clearBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  cardSub: { fontSize: 12, color: '#64748b' },
  cardMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  cardValue: { fontSize: 15, fontWeight: '800', color: '#8b5cf6' },
  mesCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16, elevation: 1 },
  mesHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  mesLabel: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  mesCount: { fontSize: 12, color: '#64748b' },
  mesTotal: { fontSize: 20, fontWeight: '800', color: '#8b5cf6' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#94a3b8' },
  modalContent: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc' },
  picker: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  pickerText: { fontSize: 15, color: '#1e293b' },
  pickerPh: { color: '#94a3b8' },
  pickerChev: { color: '#94a3b8', fontSize: 16 },
  confirmBtn: { backgroundColor: '#8b5cf6', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pickItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
})
