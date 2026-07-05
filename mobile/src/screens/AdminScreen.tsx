import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SERVER_URL } from '../config'
import { logout, SessionUser } from '../lib/auth'
import { api } from '../lib/api'

interface Props {
  navigation: any
  user: SessionUser
  onLogout: () => void
}

interface DashStats {
  totalObras: number
  obrasEmAndamento: number
  totalFuncionarios: number
  saldoGeral: number
}

export default function AdminScreen({ navigation, user, onLogout }: Props) {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [openingBrowser, setOpeningBrowser] = useState(false)

  useEffect(() => {
    api.get<DashStats>('/dashboard')
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  const abrirSistema = async () => {
    setOpeningBrowser(true)
    try {
      const token = await AsyncStorage.getItem('token')
      // Abre no navegador do celular: o endpoint web-login cria o cookie e redireciona para /
      const url = `${SERVER_URL}/api/auth/web-login?token=${token}`
      await WebBrowser.openBrowserAsync(url, {
        toolbarColor: '#0f172a',
        controlsColor: '#5165A8',
        showTitle: false,
      })
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o sistema')
    } finally {
      setOpeningBrowser(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja sair do sistema?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => { await logout(); onLogout(); navigation.replace('Login') },
      },
    ])
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>3C Engenharia</Text>
          <Text style={styles.headerSub}>Administrador · {user.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Botão principal — abrir sistema completo */}
        <TouchableOpacity
          style={[styles.mainBtn, openingBrowser && styles.mainBtnDisabled]}
          onPress={abrirSistema}
          disabled={openingBrowser}
        >
          {openingBrowser ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <Text style={styles.mainBtnIcon}>🌐</Text>
              <Text style={styles.mainBtnTitle}>Abrir Sistema Completo</Text>
              <Text style={styles.mainBtnSub}>Abre o sistema no navegador do celular{'\n'}com login automático</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Dashboard resumido */}
        <Text style={styles.sectionTitle}>Resumo</Text>

        {loadingStats ? (
          <ActivityIndicator color="#5165A8" style={{ marginTop: 20 }} />
        ) : stats ? (
          <View style={styles.statsGrid}>
            <StatCard icon="🏗️" label="Obras em Andamento" value={String(stats.obrasEmAndamento)} color="#3b82f6" />
            <StatCard icon="📁" label="Total de Obras" value={String(stats.totalObras)} color="#8b5cf6" />
            <StatCard icon="👷" label="Funcionários" value={String(stats.totalFuncionarios)} color="#3BBDB8" />
            <StatCard icon="💰" label="Saldo Geral" value={fmt(stats.saldoGeral)} color={stats.saldoGeral >= 0 ? '#22c55e' : '#ef4444'} />
          </View>
        ) : (
          <Text style={styles.noStats}>Servidor não encontrado em {SERVER_URL}</Text>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Como funciona o acesso</Text>
          <Text style={styles.infoText}>
            Toque em "Abrir Sistema Completo" para ver o sistema financeiro no navegador do celular.
            O login é automático — não é necessário digitar a senha novamente.
          </Text>
          <Text style={styles.infoServer}>Servidor: {SERVER_URL}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[cardStyles.card, { borderLeftColor: color }]}>
      <Text style={cardStyles.icon}>{icon}</Text>
      <Text style={cardStyles.value}>{value}</Text>
      <Text style={cardStyles.label}>{label}</Text>
    </View>
  )
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flex: 1, minWidth: '45%', borderLeftWidth: 4,
    elevation: 2,
  },
  icon: { fontSize: 24, marginBottom: 8 },
  value: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  label: { fontSize: 12, color: '#64748b', marginTop: 2 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#0f172a',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 12 },
  logoutBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  content: { padding: 20, gap: 16 },
  mainBtn: {
    backgroundColor: '#5165A8', borderRadius: 20,
    paddingVertical: 28, alignItems: 'center',
    elevation: 4,
  },
  mainBtnDisabled: { opacity: 0.6 },
  mainBtnIcon: { fontSize: 40, marginBottom: 8 },
  mainBtnTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  mainBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  noStats: { color: '#94a3b8', fontSize: 14, marginTop: 12 },
  infoBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#3b82f6', marginTop: 8,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  infoText: { color: '#64748b', fontSize: 13, lineHeight: 20 },
  infoServer: { color: '#94a3b8', fontSize: 11, marginTop: 8, fontFamily: 'monospace' },
})
