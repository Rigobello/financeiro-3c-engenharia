import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, ActivityIndicator, Modal, TextInput, Alert,
  ScrollView, RefreshControl,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser, isAdmin } from '../lib/auth'

interface LancamentoCaixa {
  id: string
  tipo: 'receita' | 'despesa'
  categoria: string
  descricao: string
  valor: number
  data: string
  origem: string | null
  criadoEm: string
  criadoPor: { name: string }
  obra: { id: string; nome: string } | null
}
interface Obra { id: string; nome: string }

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

const CATEGORIAS_RECEITA = ['aporte', 'medicao', 'adiantamento_cliente', 'outros']
const CATEGORIAS_DESPESA = ['material', 'mao_de_obra', 'equipamento', 'servico', 'outros']
const CAT_LABEL: Record<string, string> = {
  aporte: 'Aporte', medicao: 'Medição', adiantamento_cliente: 'Adiantamento Cliente',
  material: 'Material', mao_de_obra: 'Mão de Obra', equipamento: 'Equipamento',
  servico: 'Serviço', outros: 'Outros',
}
const ORIGENS = ['dinheiro', 'pix', 'transferencia', 'cartao', 'cheque', 'outros']
const ORIGEM_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'PIX', transferencia: 'Transferência',
  cartao: 'Cartão', cheque: 'Cheque', outros: 'Outros',
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (d: string) => new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR')

export default function CaixaScreen({ navigation, user }: Props) {
  const [lancamentos, setLancamentos] = useState<LancamentoCaixa[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroMes, setFiltroMes] = useState('')

  // Modal new
  const [modalNovo, setModalNovo] = useState(false)
  const [novoTipo, setNovoTipo] = useState<'receita' | 'despesa'>('receita')
  const [novoCat, setNovoCat] = useState('')
  const [novoDesc, setNovoDesc] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novoData, setNovoData] = useState(new Date().toISOString().slice(0, 10))
  const [novoOrigem, setNovoOrigem] = useState('')
  const [novoObraId, setNovoObraId] = useState('')
  const [saving, setSaving] = useState(false)

  // Pickers
  const [pickCat, setPickCat] = useState(false)
  const [pickOrigem, setPickOrigem] = useState(false)
  const [pickObra, setPickObra] = useState(false)
  const [pickFiltroObra, setPickFiltroObra] = useState(false)
  const [pickFiltroMes, setPickFiltroMes] = useState(false)

  const load = useCallback(async () => {
    try {
      const [lans, obs] = await Promise.all([
        api.get<LancamentoCaixa[]>('/caixa'),
        api.get<Obra[]>('/obras'),
      ])
      setLancamentos(lans)
      setObras(obs)
    } catch { }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const filtered = lancamentos.filter((l) => {
    if (filtroTipo && l.tipo !== filtroTipo) return false
    if (filtroObra && l.obra?.id !== filtroObra) return false
    if (filtroMes && !l.data.startsWith(filtroMes)) return false
    return true
  })

  const totalReceitas = filtered.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const totalDespesas = filtered.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const saldo = totalReceitas - totalDespesas

  // Build month options from data
  const meses = Array.from(new Set(lancamentos.map((l) => l.data.slice(0, 7)))).sort().reverse()
  const selectedObraFiltro = obras.find((o) => o.id === filtroObra)

  const criarLancamento = async () => {
    if (!novoCat || !novoDesc || !novoValor || !novoData) { Alert.alert('Atenção', 'Preencha todos os campos'); return }
    setSaving(true)
    try {
      await api.post('/caixa', {
        tipo: novoTipo,
        categoria: novoCat,
        descricao: novoDesc,
        valor: parseFloat(novoValor.replace(',', '.')),
        data: novoData,
        origem: novoOrigem || undefined,
        obraId: novoObraId || undefined,
      })
      setModalNovo(false)
      setNovoCat(''); setNovoDesc(''); setNovoValor('')
      setNovoData(new Date().toISOString().slice(0, 10))
      setNovoOrigem(''); setNovoObraId('')
      load()
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSaving(false) }
  }

  const selectedObraNew = obras.find((o) => o.id === novoObraId)
  const categorias = novoTipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Caixa</Text>
          <Text style={s.headerSub}>{lancamentos.length} lançamento(s)</Text>
        </View>
        {isAdmin(user) && (
          <TouchableOpacity style={s.addBtn} onPress={() => setModalNovo(true)}>
            <Text style={s.addBtnText}>+ Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary cards */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { flex: 1 }]}>
          <Text style={s.summaryLabel}>Receitas</Text>
          <Text style={[s.summaryValue, { color: '#16a34a' }]}>{fmt(totalReceitas)}</Text>
        </View>
        <View style={[s.summaryCard, { flex: 1 }]}>
          <Text style={s.summaryLabel}>Despesas</Text>
          <Text style={[s.summaryValue, { color: '#dc2626' }]}>{fmt(totalDespesas)}</Text>
        </View>
        <View style={[s.summaryCard, { flex: 1, backgroundColor: saldo >= 0 ? '#f0fdf4' : '#fff1f2' }]}>
          <Text style={s.summaryLabel}>Saldo</Text>
          <Text style={[s.summaryValue, { color: saldo >= 0 ? '#16a34a' : '#dc2626' }]}>{fmt(saldo)}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={s.filtroRow}>
        {/* tipo */}
        {['', 'receita', 'despesa'].map((t) => (
          <TouchableOpacity key={t} style={[s.filtroBtn, filtroTipo === t && s.filtroBtnActive]} onPress={() => setFiltroTipo(t)}>
            <Text style={[s.filtroBtnText, filtroTipo === t && s.filtroBtnTextActive]}>
              {t === '' ? 'Todos' : t === 'receita' ? 'Receitas' : 'Despesas'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[s.filtroBtn, filtroObra ? s.filtroBtnActive : null]} onPress={() => setPickFiltroObra(true)}>
          <Text style={[s.filtroBtnText, filtroObra && s.filtroBtnTextActive]}>{selectedObraFiltro ? selectedObraFiltro.nome.slice(0, 10) + '…' : 'Obra'} ▾</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.filtroBtn, filtroMes ? s.filtroBtnActive : null]} onPress={() => setPickFiltroMes(true)}>
          <Text style={[s.filtroBtnText, filtroMes && s.filtroBtnTextActive]}>{filtroMes || 'Mês'} ▾</Text>
        </TouchableOpacity>
        {(filtroObra || filtroMes) && (
          <TouchableOpacity style={s.clearBtn} onPress={() => { setFiltroObra(''); setFiltroMes('') }}>
            <Text style={s.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#5165A8" />}
          ListEmptyComponent={
            <View style={s.empty}><Text style={s.emptyIcon}>💵</Text><Text style={s.emptyText}>Nenhum lançamento encontrado</Text></View>
          }
          renderItem={({ item: l }) => (
            <View style={sc.card}>
              <View style={[sc.typeBadge, { backgroundColor: l.tipo === 'receita' ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={[sc.typeTxt, { color: l.tipo === 'receita' ? '#16a34a' : '#dc2626' }]}>
                  {l.tipo === 'receita' ? '↑' : '↓'} {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                </Text>
              </View>
              <View style={sc.row}>
                <View style={{ flex: 1 }}>
                  <Text style={sc.desc}>{l.descricao}</Text>
                  <Text style={sc.cat}>{CAT_LABEL[l.categoria] || l.categoria}</Text>
                  {l.obra && <Text style={sc.obra}>{l.obra.nome}</Text>}
                  {l.origem && <Text style={sc.origem}>{ORIGEM_LABEL[l.origem] || l.origem}</Text>}
                  <Text style={sc.date}>{fmtDate(l.data)} · {l.criadoPor.name}</Text>
                </View>
                <Text style={[sc.valor, { color: l.tipo === 'receita' ? '#16a34a' : '#dc2626' }]}>
                  {l.tipo === 'despesa' ? '−' : '+'}{fmt(l.valor)}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}

      {/* Modal Novo Lançamento */}
      <Modal visible={modalNovo} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Novo Lançamento de Caixa</Text>
            <TouchableOpacity onPress={() => setModalNovo(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={s.label}>Tipo *</Text>
            <View style={s.toggleRow}>
              {(['receita', 'despesa'] as const).map((t) => (
                <TouchableOpacity key={t} style={[s.toggleBtn, novoTipo === t && (t === 'receita' ? s.toggleReceita : s.toggleDespesa)]}
                  onPress={() => { setNovoTipo(t); setNovoCat('') }}>
                  <Text style={[s.toggleTxt, novoTipo === t && s.toggleTxtActive]}>
                    {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Categoria *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickCat(true)}>
              <Text style={[s.pickerText, !novoCat && s.pickerPh]}>{novoCat ? CAT_LABEL[novoCat] : 'Selecione...'}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Descrição *</Text>
            <TextInput style={s.input} value={novoDesc} onChangeText={setNovoDesc} placeholder="Descreva o lançamento..." />

            <Text style={s.label}>Valor (R$) *</Text>
            <TextInput style={s.input} value={novoValor} onChangeText={setNovoValor} keyboardType="decimal-pad" placeholder="0,00" />

            <Text style={s.label}>Data *</Text>
            <TextInput style={s.input} value={novoData} onChangeText={setNovoData} placeholder="YYYY-MM-DD" />

            <Text style={s.label}>Forma de pagamento</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickOrigem(true)}>
              <Text style={[s.pickerText, !novoOrigem && s.pickerPh]}>{novoOrigem ? ORIGEM_LABEL[novoOrigem] : 'Selecione (opcional)...'}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Obra (opcional)</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickObra(true)}>
              <Text style={[s.pickerText, !novoObraId && s.pickerPh]}>{selectedObraNew ? selectedObraNew.nome : 'Nenhuma obra...'}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.confirmBtn, saving && s.confirmBtnDisabled]} onPress={criarLancamento} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Registrar Lançamento</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Categoria */}
      <Modal visible={pickCat} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Categoria</Text><TouchableOpacity onPress={() => setPickCat(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{categorias.map((c) => (
            <TouchableOpacity key={c} style={s.pickItem} onPress={() => { setNovoCat(c); setPickCat(false) }}>
              <Text style={s.pickTitle}>{CAT_LABEL[c]}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Origem */}
      <Modal visible={pickOrigem} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Forma de Pagamento</Text><TouchableOpacity onPress={() => setPickOrigem(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <TouchableOpacity style={s.pickItem} onPress={() => { setNovoOrigem(''); setPickOrigem(false) }}><Text style={s.pickTitle}>Nenhuma</Text></TouchableOpacity>
            {ORIGENS.map((o) => (
              <TouchableOpacity key={o} style={s.pickItem} onPress={() => { setNovoOrigem(o); setPickOrigem(false) }}>
                <Text style={s.pickTitle}>{ORIGEM_LABEL[o]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Obra (novo lançamento) */}
      <Modal visible={pickObra} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Obra</Text><TouchableOpacity onPress={() => setPickObra(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <TouchableOpacity style={s.pickItem} onPress={() => { setNovoObraId(''); setPickObra(false) }}><Text style={s.pickTitle}>Sem obra</Text></TouchableOpacity>
            {obras.map((o) => (
              <TouchableOpacity key={o.id} style={s.pickItem} onPress={() => { setNovoObraId(o.id); setPickObra(false) }}>
                <Text style={s.pickTitle}>{o.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Filtro Obra */}
      <Modal visible={pickFiltroObra} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Filtrar por Obra</Text><TouchableOpacity onPress={() => setPickFiltroObra(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <TouchableOpacity style={s.pickItem} onPress={() => { setFiltroObra(''); setPickFiltroObra(false) }}><Text style={s.pickTitle}>Todas as obras</Text></TouchableOpacity>
            {obras.map((o) => (
              <TouchableOpacity key={o.id} style={s.pickItem} onPress={() => { setFiltroObra(o.id); setPickFiltroObra(false) }}>
                <Text style={s.pickTitle}>{o.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Filtro Mês */}
      <Modal visible={pickFiltroMes} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Filtrar por Mês</Text><TouchableOpacity onPress={() => setPickFiltroMes(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <TouchableOpacity style={s.pickItem} onPress={() => { setFiltroMes(''); setPickFiltroMes(false) }}><Text style={s.pickTitle}>Todos os meses</Text></TouchableOpacity>
            {meses.map((m) => (
              <TouchableOpacity key={m} style={s.pickItem} onPress={() => { setFiltroMes(m); setPickFiltroMes(false) }}>
                <Text style={s.pickTitle}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const sc = StyleSheet.create({
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 14, padding: 14, elevation: 1 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  typeTxt: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  desc: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cat: { fontSize: 12, color: '#64748b', marginTop: 2 },
  obra: { fontSize: 12, color: '#5165A8', fontWeight: '600', marginTop: 2 },
  origem: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  date: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  valor: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
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
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  summaryValue: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  filtroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  filtroBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  filtroBtnActive: { backgroundColor: '#5165A8', borderColor: '#5165A8' },
  filtroBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filtroBtnTextActive: { color: '#fff' },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fee2e2' },
  clearBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
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
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center' },
  toggleReceita: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  toggleDespesa: { borderColor: '#ef4444', backgroundColor: '#fff1f2' },
  toggleTxt: { fontWeight: '700', color: '#64748b', fontSize: 14 },
  toggleTxtActive: { color: '#1e293b' },
  confirmBtn: { backgroundColor: '#5165A8', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pickItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
})
