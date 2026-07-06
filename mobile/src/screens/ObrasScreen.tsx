import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser } from '../lib/auth'

interface Obra {
  id: string
  nome: string
  cliente: string
  cidade: string | null
  status: string
  orcamento: number
  saldo: number
  totalEntradas: number
  totalSaidas: number
  dataInicio: string
  dataFim: string | null
  _count: { lancamentos: number; pagamentos: number; funcionariosObra: number }
}

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

const STATUS_LABEL: Record<string, string> = {
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  pausada: 'Pausada',
  cancelada: 'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  em_andamento: '#22c55e',
  concluida: '#5165A8',
  pausada: '#f59e0b',
  cancelada: '#ef4444',
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

export default function ObrasScreen({ navigation, user }: Props) {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtro, setFiltro] = useState<'todas' | 'em_andamento' | 'concluida'>('em_andamento')

  const load = useCallback(async () => {
    try {
      const data = await api.get<Obra[]>('/obras')
      setObras(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [])

  const obrasFiltradas = filtro === 'todas' ? obras : obras.filter((o) => o.status === filtro)
  const emAndamento = obras.filter((o) => o.status === 'em_andamento').length

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Obras</Text>
          <Text style={s.headerSub}>{emAndamento} em andamento</Text>
        </View>
      </View>

      {/* Filtros */}
      <View style={s.filtros}>
        {(['em_andamento', 'todas', 'concluida'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filtroBtn, filtro === f && s.filtroBtnActive]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[s.filtroBtnText, filtro === f && s.filtroBtnTextActive]}>
              {f === 'em_andamento' ? 'Em Andamento' : f === 'todas' ? 'Todas' : 'Concluídas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#5165A8" />}
        >
          {obrasFiltradas.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🏗️</Text>
              <Text style={s.emptyText}>Nenhuma obra encontrada</Text>
            </View>
          )}
          {obrasFiltradas.map((obra) => (
            <View key={obra.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.obraNome}>{obra.nome}</Text>
                  <Text style={s.obraCliente}>{obra.cliente}{obra.cidade ? ` · ${obra.cidade}` : ''}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[obra.status] + '20' }]}>
                  <Text style={[s.statusText, { color: STATUS_COLOR[obra.status] }]}>
                    {STATUS_LABEL[obra.status] || obra.status}
                  </Text>
                </View>
              </View>

              <View style={s.financeiro}>
                <View style={s.finItem}>
                  <Text style={s.finLabel}>Orçamento</Text>
                  <Text style={s.finValue}>{fmt(obra.orcamento)}</Text>
                </View>
                <View style={s.finItem}>
                  <Text style={s.finLabel}>Entradas</Text>
                  <Text style={[s.finValue, { color: '#22c55e' }]}>{fmt(obra.totalEntradas)}</Text>
                </View>
                <View style={s.finItem}>
                  <Text style={s.finLabel}>Saídas</Text>
                  <Text style={[s.finValue, { color: '#ef4444' }]}>{fmt(obra.totalSaidas)}</Text>
                </View>
                <View style={s.finItem}>
                  <Text style={s.finLabel}>Saldo</Text>
                  <Text style={[s.finValue, { color: obra.saldo >= 0 ? '#5165A8' : '#ef4444', fontWeight: '800' }]}>
                    {fmt(obra.saldo)}
                  </Text>
                </View>
              </View>

              <View style={s.cardFooter}>
                <Text style={s.footerText}>
                  Início: {fmtDate(obra.dataInicio)}{obra.dataFim ? ` · Fim: ${fmtDate(obra.dataFim)}` : ''}
                </Text>
                <View style={s.counters}>
                  <Text style={s.counter}>👷 {obra._count.funcionariosObra}</Text>
                  <Text style={s.counter}>📄 {obra._count.lancamentos}</Text>
                </View>
              </View>
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
  filtros: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  filtroBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  filtroBtnActive: { backgroundColor: '#5165A8', borderColor: '#5165A8' },
  filtroBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filtroBtnTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  obraNome: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  obraCliente: { fontSize: 13, color: '#64748b' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  financeiro: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  finItem: { flex: 1, minWidth: '22%' },
  finLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  finValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  footerText: { fontSize: 11, color: '#94a3b8' },
  counters: { flexDirection: 'row', gap: 8 },
  counter: { fontSize: 12, color: '#64748b' },
})
