import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { logout, SessionUser } from '../lib/auth'
import { api } from '../lib/api'

interface DashStats {
  totalObras: number
  obrasEmAndamento: number
  obrasConcluidas: number
  funcionariosAtivos: number
  saldoGeral: number
  totalEntradas: number
  totalSaidas: number
  totalPagamentos: number
}

interface Props {
  navigation: any
  user: SessionUser
  onLogout: () => void
}

const NAV_ITEMS = [
  { id: 'obras', icon: '🏗️', label: 'Obras', sub: 'Lista completa e status', screen: 'Obras', color: '#5165A8' },
  { id: 'consolidado', icon: '📊', label: 'Consolidado Geral', sub: 'Visão completa do sistema', screen: 'Consolidado', color: '#3D4D80' },
  { id: 'atividades', icon: '📋', label: 'Controle de Atividades', sub: 'Progresso semanal das obras', screen: 'ControleAtividades', color: '#3BBDB8' },
  { id: 'ponto', icon: '⏰', label: 'Registro de Ponto', sub: 'Gestão de entrada e saída', screen: 'Ponto', color: '#22c55e' },
  { id: 'engineer', icon: '💰', label: 'Adiantamentos', sub: 'Autorizar solicitações', screen: 'Engineer', color: '#3b82f6' },
  { id: 'almox', icon: '📦', label: 'Almoxarifado', sub: 'Materiais e movimentações', screen: 'Almoxarifado', color: '#3BBDB8' },
  { id: 'funcionarios', icon: '👷', label: 'Funcionários', sub: 'Equipe e cargos', screen: 'Funcionarios', color: '#475569' },
  { id: 'foto', icon: '📸', label: 'Fotos da Obra', sub: 'Registro fotográfico', screen: 'FotoObra', color: '#8b5cf6' },
  { id: 'ocr', icon: '📄', label: 'Envio de Recibos', sub: 'OCR de notas fiscais', screen: 'User', color: '#64748b' },
  { id: 'pagamentos', icon: '💸', label: 'Pagamentos', sub: 'Histórico de pagamentos a funcionários', screen: 'Pagamentos', color: '#8b5cf6' },
  { id: 'solicitacoes', icon: '💰', label: 'Adiantamentos', sub: 'Solicitações e aprovações', screen: 'Solicitacoes', color: '#3b82f6' },
  { id: 'caixa', icon: '💵', label: 'Caixa', sub: 'Fluxo de receitas e despesas', screen: 'Caixa', color: '#22c55e' },
]

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function AdminScreen({ navigation, user, onLogout }: Props) {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<any>('/dashboard')
      .then((d) => setStats({
        totalObras: d.totalObras,
        obrasEmAndamento: d.obrasEmAndamento,
        obrasConcluidas: d.obrasConcluidas,
        funcionariosAtivos: d.funcionariosAtivos ?? d.totalFuncionarios,
        saldoGeral: d.saldoGeral,
        totalEntradas: d.totalEntradas,
        totalSaidas: d.totalSaidas,
        totalPagamentos: d.totalPagamentos,
      }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja sair do sistema?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => { await logout(); onLogout(); navigation.replace('Login') },
      },
    ])
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Painel Administrativo</Text>
          <Text style={s.headerSub}>{user.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Text style={s.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Stats */}
        {loading ? (
          <ActivityIndicator color="#5165A8" style={{ marginVertical: 20 }} />
        ) : stats ? (
          <View style={s.statsGrid}>
            <StatCard icon="🏗️" label="Obras Em Andamento" value={String(stats.obrasEmAndamento)} color="#5165A8" />
            <StatCard icon="📁" label="Total de Obras" value={String(stats.totalObras)} color="#3D4D80" />
            <StatCard icon="👷" label="Funcionários" value={String(stats.funcionariosAtivos)} color="#3BBDB8" />
            <StatCard icon="💰" label="Saldo Geral" value={fmt(stats.saldoGeral)} color={stats.saldoGeral >= 0 ? '#22c55e' : '#ef4444'} />
            <StatCard icon="📈" label="Total Entradas" value={fmt(stats.totalEntradas)} color="#22c55e" />
            <StatCard icon="📉" label="Total Saídas" value={fmt(stats.totalSaidas + stats.totalPagamentos)} color="#ef4444" />
          </View>
        ) : (
          <View style={s.noStats}>
            <Text style={s.noStatsText}>Servidor não disponível</Text>
          </View>
        )}

        {/* Navigation */}
        <Text style={s.sectionTitle}>Módulos do Sistema</Text>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={s.navItem}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={[s.navIcon, { backgroundColor: item.color + '18' }]}>
              <Text style={s.navIconText}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.navLabel}>{item.label}</Text>
              <Text style={s.navSub}>{item.sub}</Text>
            </View>
            <Text style={[s.navChev, { color: item.color }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[cs.card, { borderLeftColor: color }]}>
      <Text style={cs.icon}>{icon}</Text>
      <Text style={[cs.value, { color }]}>{value}</Text>
      <Text style={cs.label}>{label}</Text>
    </View>
  )
}

const cs = StyleSheet.create({
  card: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, borderLeftWidth: 3, elevation: 1,
  },
  icon: { fontSize: 20, marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 11, color: '#64748b', fontWeight: '600' },
})

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0f172a',
  },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 12 },
  logoutBtn: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  noStats: { alignItems: 'center', paddingVertical: 20 },
  noStatsText: { color: '#94a3b8', fontSize: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    elevation: 1,
  },
  navIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navIconText: { fontSize: 22 },
  navLabel: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  navSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  navChev: { fontSize: 24, fontWeight: '700' },
})
