import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, ActivityIndicator, RefreshControl, TextInput,
  Modal, ScrollView, Alert,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser, isAdmin } from '../lib/auth'

interface Funcionario {
  id: string
  nome: string
  cargo: string
  cpf: string | null
  status: string
  salarioBase: number
  valorHora: number | null
  telefone: string | null
  email: string | null
  totalRecebido: number
  obrasAtivas: number
}

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const CARGOS = ['Pedreiro', 'Servente', 'Eletricista', 'Encanador', 'Carpinteiro', 'Pintor',
  'Armador', 'Mestre de Obras', 'Engenheiro', 'Técnico', 'Administrativo', 'Outros']

export default function FuncionariosScreen({ navigation, user }: Props) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'ativo' | 'todos'>('ativo')

  // Modal criar/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Funcionario | null>(null)
  const [fNome, setFNome] = useState('')
  const [fCargo, setFCargo] = useState('')
  const [fCpf, setFCpf] = useState('')
  const [fSalario, setFSalario] = useState('')
  const [fHora, setFHora] = useState('')
  const [fTelefone, setFTelefone] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fStatus, setFStatus] = useState('ativo')
  const [saving, setSaving] = useState(false)
  const [pickCargo, setPickCargo] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.get<Funcionario[]>('/funcionarios')
      setFuncionarios(data)
    } catch { }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const lista = funcionarios
    .filter((f) => filtroStatus === 'todos' || f.status === filtroStatus)
    .filter((f) => !busca || f.nome.toLowerCase().includes(busca.toLowerCase()) || f.cargo.toLowerCase().includes(busca.toLowerCase()))

  const ativos = funcionarios.filter((f) => f.status === 'ativo').length

  const openCreate = () => {
    setEditTarget(null)
    setFNome(''); setFCargo(''); setFCpf(''); setFSalario('')
    setFHora(''); setFTelefone(''); setFEmail(''); setFStatus('ativo')
    setModalOpen(true)
  }

  const openEdit = (f: Funcionario) => {
    setEditTarget(f)
    setFNome(f.nome); setFCargo(f.cargo); setFCpf(f.cpf ?? '')
    setFSalario(String(f.salarioBase)); setFHora(f.valorHora ? String(f.valorHora) : '')
    setFTelefone(f.telefone ?? ''); setFEmail(f.email ?? ''); setFStatus(f.status)
    setModalOpen(true)
  }

  const salvar = async () => {
    if (!fNome.trim()) { Alert.alert('Atenção', 'Nome é obrigatório'); return }
    if (!fCargo.trim()) { Alert.alert('Atenção', 'Cargo é obrigatório'); return }
    setSaving(true)
    const body = {
      nome: fNome.trim(),
      cargo: fCargo.trim(),
      cpf: fCpf.trim() || undefined,
      salarioBase: parseFloat(fSalario.replace(',', '.')) || 0,
      valorHora: fHora ? parseFloat(fHora.replace(',', '.')) : undefined,
      telefone: fTelefone.trim() || undefined,
      email: fEmail.trim() || undefined,
      status: fStatus,
    }
    try {
      if (editTarget) {
        await api.put(`/funcionarios/${editTarget.id}`, body)
        Alert.alert('Salvo!', `Dados de ${fNome} atualizados.`)
      } else {
        await api.post('/funcionarios', body)
        Alert.alert('Criado!', `Funcionário ${fNome} cadastrado.`)
      }
      setModalOpen(false)
      load()
    } catch (err: any) { Alert.alert('Erro', err.message) }
    finally { setSaving(false) }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Funcionários</Text>
          <Text style={s.headerSub}>{ativos} ativos</Text>
        </View>
        {isAdmin(user) && (
          <TouchableOpacity style={s.addBtn} onPress={openCreate}>
            <Text style={s.addBtnText}>+ Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Busca + filtro */}
      <View style={s.buscaRow}>
        <TextInput style={s.buscaInput} value={busca} onChangeText={setBusca}
          placeholder="Buscar por nome ou cargo..." clearButtonMode="while-editing" />
        <TouchableOpacity
          style={[s.statusToggle, filtroStatus === 'todos' && s.statusToggleAll]}
          onPress={() => setFiltroStatus(filtroStatus === 'ativo' ? 'todos' : 'ativo')}>
          <Text style={[s.statusToggleText, filtroStatus === 'todos' && s.statusToggleTextAll]}>
            {filtroStatus === 'ativo' ? 'Ativos' : 'Todos'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#5165A8" />}
          ListEmptyComponent={
            <View style={s.empty}><Text style={s.emptyIcon}>👷</Text><Text style={s.emptyText}>Nenhum funcionário encontrado</Text></View>
          }
          contentContainerStyle={s.list}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={s.card}
              activeOpacity={isAdmin(user) ? 0.75 : 1}
              onPress={() => isAdmin(user) && openEdit(f)}>
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{f.nome.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.nome}>{f.nome}</Text>
                  <Text style={s.cargo}>{f.cargo}</Text>
                </View>
                <View style={s.rightCol}>
                  <View style={[s.statusBadge, { backgroundColor: f.status === 'ativo' ? '#dcfce7' : '#f1f5f9' }]}>
                    <Text style={[s.statusText, { color: f.status === 'ativo' ? '#16a34a' : '#64748b' }]}>
                      {f.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Text>
                  </View>
                  {isAdmin(user) && <Text style={s.editHint}>✎ editar</Text>}
                </View>
              </View>

              <View style={s.stats}>
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Salário Base</Text>
                  <Text style={s.statValue}>{fmt(f.salarioBase)}</Text>
                </View>
                {f.valorHora != null && (
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>Valor/Hora</Text>
                    <Text style={s.statValue}>{fmt(f.valorHora)}</Text>
                  </View>
                )}
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Total Recebido</Text>
                  <Text style={[s.statValue, { color: '#22c55e' }]}>{fmt(f.totalRecebido)}</Text>
                </View>
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Obras Ativas</Text>
                  <Text style={s.statValue}>{f.obrasAtivas}</Text>
                </View>
              </View>

              {(f.telefone || f.cpf) && (
                <View style={s.extra}>
                  {f.telefone && <Text style={s.extraText}>📞 {f.telefone}</Text>}
                  {f.cpf && <Text style={s.extraText}>CPF: {f.cpf}</Text>}
                  {f.email && <Text style={s.extraText}>✉ {f.email}</Text>}
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal Criar/Editar */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{editTarget ? 'Editar Funcionário' : 'Novo Funcionário'}</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={s.label}>Nome completo *</Text>
            <TextInput style={s.input} value={fNome} onChangeText={setFNome} placeholder="Nome do funcionário" />

            <Text style={s.label}>Cargo *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickCargo(true)}>
              <Text style={[s.pickerText, !fCargo && s.pickerPh]}>{fCargo || 'Selecione o cargo...'}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>CPF</Text>
            <TextInput style={s.input} value={fCpf} onChangeText={setFCpf} placeholder="000.000.000-00" keyboardType="numeric" />

            <Text style={s.label}>Salário Base (R$) *</Text>
            <TextInput style={s.input} value={fSalario} onChangeText={setFSalario} placeholder="0,00" keyboardType="decimal-pad" />

            <Text style={s.label}>Valor por Hora (R$)</Text>
            <TextInput style={s.input} value={fHora} onChangeText={setFHora} placeholder="0,00 (opcional)" keyboardType="decimal-pad" />

            <Text style={s.label}>Telefone</Text>
            <TextInput style={s.input} value={fTelefone} onChangeText={setFTelefone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />

            <Text style={s.label}>E-mail</Text>
            <TextInput style={s.input} value={fEmail} onChangeText={setFEmail} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />

            <Text style={s.label}>Status</Text>
            <View style={s.statusRow}>
              {['ativo', 'inativo'].map((st) => (
                <TouchableOpacity key={st} style={[s.statusBtn, fStatus === st && s.statusBtnActive]}
                  onPress={() => setFStatus(st)}>
                  <Text style={[s.statusBtnText, fStatus === st && s.statusBtnTextActive]}>
                    {st === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[s.confirmBtn, saving && s.confirmBtnDisabled]} onPress={salvar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>{editTarget ? 'Salvar Alterações' : 'Cadastrar Funcionário'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Cargo */}
      <Modal visible={pickCargo} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Selecionar Cargo</Text><TouchableOpacity onPress={() => setPickCargo(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{CARGOS.map((c) => (
            <TouchableOpacity key={c} style={s.pickItem} onPress={() => { setFCargo(c); setPickCargo(false) }}>
              <Text style={s.pickTitle}>{c}</Text>
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
  buscaRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  buscaInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc' },
  statusToggle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#eef1f8', borderWidth: 1, borderColor: '#d5dced', justifyContent: 'center' },
  statusToggleAll: { backgroundColor: '#3D4D80', borderColor: '#3D4D80' },
  statusToggleText: { fontSize: 13, fontWeight: '700', color: '#5165A8' },
  statusToggleTextAll: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eef1f8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#5165A8', fontSize: 18, fontWeight: '800' },
  nome: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cargo: { fontSize: 13, color: '#64748b' },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  editHint: { fontSize: 10, color: '#94a3b8' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statItem: { flex: 1, minWidth: '40%' },
  statLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 1 },
  statValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  extra: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  extraText: { fontSize: 12, color: '#64748b' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#94a3b8' },
  modalContent: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc' },
  picker: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  pickerText: { fontSize: 15, color: '#1e293b', flex: 1 },
  pickerPh: { color: '#94a3b8' },
  pickerChev: { color: '#94a3b8', fontSize: 16 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center' },
  statusBtnActive: { borderColor: '#5165A8', backgroundColor: '#eef1f8' },
  statusBtnText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  statusBtnTextActive: { color: '#5165A8' },
  confirmBtn: { backgroundColor: '#5165A8', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pickItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
})
