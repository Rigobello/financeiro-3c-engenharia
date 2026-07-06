import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser } from '../lib/auth'

interface Atividade {
  id: string
  nome: string
  descricao: string | null
  peso: number
  unidade: string | null
  percentualAcumuladoAnterior: number
  percentualPlanejadoSemana: number
  percentualExecutadoSemana: number
  percentualAcumuladoAtual: number
  observacao: string | null
}

interface ObraControle {
  obra: { id: string; nome: string; cliente: string; cidade: string | null }
  semana: string
  periodoInicio: string
  periodoFim: string
  atividades: Atividade[]
  evolucaoPonderada: number
}

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

function shiftWeek(isoWeek: string, delta: number): string {
  const [year, week] = isoWeek.split('-W').map(Number)
  const jan4 = new Date(year, 0, 4)
  const startW1 = new Date(jan4)
  startW1.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1)
  const start = new Date(startW1)
  start.setDate(startW1.getDate() + (week - 1 + delta) * 7)
  return getISOWeek(start)
}

function fmtWeekLabel(semana: string, inicio: string, fim: string): string {
  const s = new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const e = new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${semana} (${s} – ${e})`
}

function ProgressBar({ value, color = '#5165A8' }: { value: number; color?: string }) {
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${Math.min(100, value)}%`, backgroundColor: color }]} />
    </View>
  )
}

const pb = StyleSheet.create({
  track: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: 3 },
})

export default function ControleAtividadesScreen({ navigation, user }: Props) {
  const [semana, setSemana] = useState(getISOWeek(new Date()))
  const [data, setData] = useState<ObraControle[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [periodoLabel, setPeriodoLabel] = useState('')

  const load = useCallback(async (sem: string) => {
    try {
      const res = await api.get<ObraControle[]>(`/controle-atividades?semana=${sem}`)
      setData(res)
      if (res.length > 0) {
        setPeriodoLabel(fmtWeekLabel(res[0].semana, res[0].periodoInicio, res[0].periodoFim))
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load(semana) }, [semana])

  const goWeek = (delta: number) => {
    setLoading(true)
    const next = shiftWeek(semana, delta)
    setSemana(next)
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Controle de Atividades</Text>
          <Text style={s.headerSub}>{data.length} obras</Text>
        </View>
      </View>

      {/* Week navigator */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => goWeek(-1)} style={s.weekArrow}>
          <Text style={s.weekArrowText}>◀</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.weekLabel}>{semana}</Text>
          {periodoLabel ? <Text style={s.weekPeriodo}>{periodoLabel.split('(')[1]?.replace(')', '') ?? ''}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => goWeek(+1)} style={s.weekArrow}>
          <Text style={s.weekArrowText}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { const w = getISOWeek(new Date()); setSemana(w); setLoading(true) }} style={s.weekToday}>
          <Text style={s.weekTodayText}>Hoje</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(semana) }} tintColor="#5165A8" />}
        >
          {data.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyText}>Nenhuma obra com atividades para esta semana</Text>
            </View>
          )}
          {data.map((item) => (
            <View key={item.obra.id} style={s.obraCard}>
              {/* Obra header */}
              <View style={s.obraHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.obraNome}>{item.obra.nome}</Text>
                  <Text style={s.obraCliente}>{item.obra.cliente}{item.obra.cidade ? ` · ${item.obra.cidade}` : ''}</Text>
                </View>
                <View style={s.evolucaoBadge}>
                  <Text style={s.evolucaoLabel}>Evolução</Text>
                  <Text style={[s.evolucaoValue, { color: item.evolucaoPonderada >= 70 ? '#22c55e' : item.evolucaoPonderada >= 40 ? '#f59e0b' : '#5165A8' }]}>
                    {item.evolucaoPonderada}%
                  </Text>
                </View>
              </View>

              {/* Evolução total bar */}
              <View style={s.evolucaoBarRow}>
                <ProgressBar value={item.evolucaoPonderada} color={item.evolucaoPonderada >= 70 ? '#22c55e' : '#5165A8'} />
              </View>

              {/* Atividades */}
              {item.atividades.length === 0 ? (
                <Text style={s.noAtiv}>Sem atividades cadastradas</Text>
              ) : (
                <View style={s.atividades}>
                  {/* Header row */}
                  <View style={s.atHeader}>
                    <Text style={[s.atCol, { flex: 2 }]}>Atividade</Text>
                    <Text style={[s.atCol, { width: 50, textAlign: 'center' }]}>Ant.</Text>
                    <Text style={[s.atCol, { width: 50, textAlign: 'center' }]}>Plan.</Text>
                    <Text style={[s.atCol, { width: 50, textAlign: 'center' }]}>Exec.</Text>
                    <Text style={[s.atCol, { width: 55, textAlign: 'center' }]}>Acum.</Text>
                  </View>
                  {item.atividades.map((at) => (
                    <View key={at.id} style={s.atRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={s.atNome} numberOfLines={1}>{at.nome}</Text>
                        {at.observacao ? (
                          <Text style={s.atObs} numberOfLines={1}>{at.observacao}</Text>
                        ) : null}
                        <ProgressBar value={at.percentualAcumuladoAtual} />
                      </View>
                      <Text style={s.atPct}>{at.percentualAcumuladoAnterior}%</Text>
                      <Text style={[s.atPct, { color: '#5165A8' }]}>{at.percentualPlanejadoSemana}%</Text>
                      <Text style={[s.atPct, { color: at.percentualExecutadoSemana >= at.percentualPlanejadoSemana ? '#22c55e' : '#f59e0b' }]}>
                        {at.percentualExecutadoSemana}%
                      </Text>
                      <Text style={[s.atPct, { fontWeight: '800', color: '#1e293b' }]}>{at.percentualAcumuladoAtual}%</Text>
                    </View>
                  ))}
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
  weekNav: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  weekArrow: { padding: 8 },
  weekArrowText: { color: '#5165A8', fontSize: 16, fontWeight: '700' },
  weekLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  weekPeriodo: { fontSize: 11, color: '#64748b' },
  weekToday: { backgroundColor: '#eef1f8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  weekTodayText: { color: '#5165A8', fontSize: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 12, gap: 12 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  obraCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  obraHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  obraNome: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  obraCliente: { fontSize: 12, color: '#64748b' },
  evolucaoBadge: { alignItems: 'flex-end', marginLeft: 8 },
  evolucaoLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' },
  evolucaoValue: { fontSize: 20, fontWeight: '800' },
  evolucaoBarRow: { marginBottom: 12 },
  noAtiv: { color: '#94a3b8', fontSize: 13, fontStyle: 'italic' },
  atividades: { gap: 8 },
  atHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  atCol: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  atRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  atNome: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  atObs: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 2 },
  atPct: { width: 50, textAlign: 'center', fontSize: 13, color: '#64748b', fontWeight: '600' },
})
