import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Image, ActivityIndicator,
} from 'react-native'
import { logout, SessionUser } from '../lib/auth'
import { api } from '../lib/api'

interface DashStats {
  totalObras: number
  obrasEmAndamento: number
  funcionariosAtivos: number
  saldoGeral: number
}

interface Tile {
  id: string
  label: string
  sub: string
  icon: string
  screen: string
  color: string
  bg: string
  grupos: string[]
}

const TILES: Tile[] = [
  // Admin / Engenheiro
  { id: 'obras', label: 'Obras', sub: 'Status e financeiro', icon: '🏗️', screen: 'Obras', color: '#fff', bg: '#5165A8', grupos: ['Administrador', 'Engenheiro'] },
  { id: 'consolidado', label: 'Consolidado', sub: 'Visão geral do sistema', icon: '📊', screen: 'Consolidado', color: '#fff', bg: '#3D4D80', grupos: ['Administrador', 'Engenheiro'] },
  { id: 'atividades', label: 'Atividades', sub: 'Controle semanal', icon: '📋', screen: 'ControleAtividades', color: '#1e293b', bg: '#e0f9f8', grupos: ['Administrador', 'Engenheiro'] },
  { id: 'funcionarios', label: 'Funcionários', sub: 'Equipe e cargos', icon: '👷', screen: 'Funcionarios', color: '#1e293b', bg: '#f1f5f9', grupos: ['Administrador'] },
  // Adiantamentos — todos os usuários podem criar, admins/engenheiros aprovam
  { id: 'solicitacoes', label: 'Adiantamentos', sub: 'Solicitar ou aprovar', icon: '💰', screen: 'Solicitacoes', color: '#1e293b', bg: '#dbeafe', grupos: ['Usuário', 'Ponto', 'Almoxarifado', 'Administrador', 'Engenheiro'] },
  // Pagamentos e Caixa — admin/engenheiro
  { id: 'pagamentos', label: 'Pagamentos', sub: 'Histórico de pagamentos', icon: '💸', screen: 'Pagamentos', color: '#fff', bg: '#8b5cf6', grupos: ['Administrador', 'Engenheiro'] },
  { id: 'caixa', label: 'Caixa', sub: 'Receitas e despesas', icon: '💵', screen: 'Caixa', color: '#fff', bg: '#16a34a', grupos: ['Administrador'] },
  // Ponto
  { id: 'ponto', label: 'Registro de Ponto', sub: 'Entrada e saída', icon: '⏰', screen: 'Ponto', color: '#fff', bg: '#22c55e', grupos: ['Ponto', 'Administrador'] },
  // Almoxarifado
  { id: 'almox', label: 'Almoxarifado', sub: 'Movimentação de material', icon: '📦', screen: 'Almoxarifado', color: '#fff', bg: '#3BBDB8', grupos: ['Almoxarifado', 'Administrador'] },
  // Shared
  { id: 'foto', label: 'Fotos da Obra', sub: 'Registrar e arquivar', icon: '📸', screen: 'FotoObra', color: '#fff', bg: '#8b5cf6', grupos: ['Usuário', 'Ponto', 'Almoxarifado', 'Administrador', 'Engenheiro'] },
  { id: 'ocr', label: 'Envio de Recibos', sub: 'OCR de notas fiscais', icon: '📄', screen: 'User', color: '#1e293b', bg: '#e0f2fe', grupos: ['Usuário', 'Administrador'] },
]

interface Props {
  navigation: any
  user: SessionUser
  onLogout: () => void
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v)

export default function HomeScreen({ navigation, user, onLogout }: Props) {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    api.get<any>('/dashboard')
      .then((d) => setStats({
        totalObras: d.totalObras,
        obrasEmAndamento: d.obrasEmAndamento,
        funcionariosAtivos: d.funcionariosAtivos ?? d.totalFuncionarios,
        saldoGeral: d.saldoGeral,
      }))
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  const visibleTiles = TILES.filter((t) =>
    t.grupos.some((g) => user.grupos.includes(g))
  ).filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user.name.split(' ')[0]}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/Logo3C.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoTitle}>3C Engenharia</Text>
          <Text style={styles.logoSub}>Controle Financeiro</Text>
        </View>

        {/* Dashboard Stats */}
        {loadingStats ? (
          <ActivityIndicator color="#5165A8" style={{ marginVertical: 8 }} />
        ) : stats ? (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.obrasEmAndamento}</Text>
              <Text style={styles.statLabel}>Obras Ativas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.funcionariosAtivos}</Text>
              <Text style={styles.statLabel}>Funcionários</Text>
            </View>
            <View style={[styles.statCard, { flex: 1.4 }]}>
              <Text style={[styles.statValue, { color: stats.saldoGeral >= 0 ? '#22c55e' : '#ef4444', fontSize: 15 }]}>
                {fmt(stats.saldoGeral)}
              </Text>
              <Text style={styles.statLabel}>Saldo Geral</Text>
            </View>
          </View>
        ) : null}

        {/* Tiles */}
        <Text style={styles.sectionLabel}>O que deseja fazer?</Text>
        <View style={styles.tilesRow}>
          {visibleTiles.map((tile) => (
            <TouchableOpacity
              key={tile.id}
              style={[styles.tile, { backgroundColor: tile.bg }]}
              onPress={() => navigation.navigate(tile.screen)}
              activeOpacity={0.85}
            >
              <Text style={styles.tileIcon}>{tile.icon}</Text>
              <Text style={[styles.tileLabel, { color: tile.color }]}>{tile.label}</Text>
              <Text style={[styles.tileSub, { color: tile.color, opacity: 0.7 }]}>{tile.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  greeting: { color: '#fff', fontSize: 18, fontWeight: '700' },
  grupos: { color: '#64748b', fontSize: 12, marginTop: 2 },
  logoutBtn: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  logoSection: { alignItems: 'center', paddingVertical: 16 },
  logo: { width: 88, height: 88, marginBottom: 10 },
  logoTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  logoSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  statsRow: {
    flexDirection: 'row', gap: 8, marginBottom: 20,
    backgroundColor: '#1e293b', borderRadius: 16, padding: 12,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 2, textAlign: 'center' },
  sectionLabel: {
    color: '#475569', fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1,
  },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%', borderRadius: 20, padding: 20,
    minHeight: 130, justifyContent: 'flex-end',
  },
  tileIcon: { fontSize: 36, marginBottom: 8 },
  tileLabel: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  tileSub: { fontSize: 12 },
})
