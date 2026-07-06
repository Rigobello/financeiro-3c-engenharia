import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser } from '../lib/auth'

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

export default function FuncionariosScreen({ navigation, user }: Props) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'ativo' | 'todos'>('ativo')

  const load = useCallback(async () => {
    try {
      const data = await api.get<Funcionario[]>('/funcionarios')
      setFuncionarios(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [])

  const lista = funcionarios
    .filter((f) => filtroStatus === 'todos' || f.status === filtroStatus)
    .filter((f) => !busca || f.nome.toLowerCase().includes(busca.toLowerCase()) || f.cargo.toLowerCase().includes(busca.toLowerCase()))

  const ativos = funcionarios.filter((f) => f.status === 'ativo').length

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
      </View>

      {/* Busca + filtro */}
      <View style={s.buscaRow}>
        <TextInput
          style={s.buscaInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome ou cargo..."
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          style={[s.statusToggle, filtroStatus === 'todos' && s.statusToggleAll]}
          onPress={() => setFiltroStatus(filtroStatus === 'ativo' ? 'todos' : 'ativo')}
        >
          <Text style={[s.statusToggleText, filtroStatus === 'todos' && s.statusToggleTextAll]}>
            {filtroStatus === 'ativo' ? 'Ativos' : 'Todos'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#5165A8" />}
        >
          {lista.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>👷</Text>
              <Text style={s.emptyText}>Nenhum funcionário encontrado</Text>
            </View>
          )}
          {lista.map((f) => (
            <View key={f.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{f.nome.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.nome}>{f.nome}</Text>
                  <Text style={s.cargo}>{f.cargo}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: f.status === 'ativo' ? '#dcfce7' : '#f1f5f9' }]}>
                  <Text style={[s.statusText, { color: f.status === 'ativo' ? '#16a34a' : '#64748b' }]}>
                    {f.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Text>
                </View>
              </View>

              <View style={s.stats}>
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Salário Base</Text>
                  <Text style={s.statValue}>{fmt(f.salarioBase)}</Text>
                </View>
                {f.valorHora && (
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
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
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
  buscaRow: {
    flexDirection: 'row', gap: 8, padding: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  buscaInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  statusToggle: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#eef1f8', borderWidth: 1, borderColor: '#d5dced',
    justifyContent: 'center',
  },
  statusToggleAll: { backgroundColor: '#3D4D80', borderColor: '#3D4D80' },
  statusToggleText: { fontSize: 13, fontWeight: '700', color: '#5165A8' },
  statusToggleTextAll: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#eef1f8', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#5165A8', fontSize: 18, fontWeight: '800' },
  nome: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cargo: { fontSize: 13, color: '#64748b' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statItem: { flex: 1, minWidth: '40%' },
  statLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 1 },
  statValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  extra: { flexDirection: 'row', gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  extraText: { fontSize: 12, color: '#64748b' },
})
