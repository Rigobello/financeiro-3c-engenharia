import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native'
import { logout, SessionUser } from '../lib/auth'

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
  { id: 'admin', label: 'Sistema Completo', sub: 'Acesso via navegador', icon: '🌐', screen: 'Admin', color: '#fff', bg: '#5165A8', grupos: ['Administrador'] },
  { id: 'engineer', label: 'Adiantamentos', sub: 'Autorizar solicitações', icon: '💰', screen: 'Engineer', color: '#1e293b', bg: '#dbeafe', grupos: ['Engenheiro', 'Administrador'] },
  { id: 'ponto', label: 'Registro de Ponto', sub: 'Entrada e saída', icon: '⏰', screen: 'Ponto', color: '#fff', bg: '#22c55e', grupos: ['Ponto', 'Administrador'] },
  { id: 'almox', label: 'Almoxarifado', sub: 'Movimentação de material', icon: '📦', screen: 'Almoxarifado', color: '#fff', bg: '#3BBDB8', grupos: ['Almoxarifado', 'Administrador'] },
  { id: 'foto', label: 'Fotos da Obra', sub: 'Registrar e arquivar', icon: '📸', screen: 'FotoObra', color: '#fff', bg: '#8b5cf6', grupos: ['Usuário', 'Ponto', 'Almoxarifado', 'Administrador'] },
  { id: 'ocr', label: 'Envio de Recibos', sub: 'OCR de notas fiscais', icon: '📄', screen: 'User', color: '#1e293b', bg: '#e0f2fe', grupos: ['Usuário', 'Administrador'] },
]

interface Props {
  navigation: any
  user: SessionUser
  onLogout: () => void
}

export default function HomeScreen({ navigation, user, onLogout }: Props) {
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
          <Text style={styles.greeting}>Olá, {user.name.split(' ')[0]} 👋</Text>
          <Text style={styles.grupos}>{user.grupos.join(' · ')}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>3C</Text>
        </View>
        <Text style={styles.logoTitle}>3C Engenharia</Text>
        <Text style={styles.logoSub}>Controle Financeiro</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
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
  logoSection: { alignItems: 'center', paddingVertical: 24 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: '#5165A8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  logoTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  logoSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  grid: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionLabel: { color: '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%', borderRadius: 20, padding: 20,
    minHeight: 130, justifyContent: 'flex-end',
  },
  tileIcon: { fontSize: 36, marginBottom: 8 },
  tileLabel: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  tileSub: { fontSize: 12 },
})
