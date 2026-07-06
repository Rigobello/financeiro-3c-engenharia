import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, RefreshControl, TextInput, Alert,
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

function fmtWeekLabel(inicio: string, fim: string): string {
  const s = new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const e = new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${s} – ${e}`
}

function ProgressBar({ value, color = '#5165A8' }: { value: number; color?: string }) {
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
    </View>
  )
}

const pb = StyleSheet.create({
  track: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: 3 },
})

function PesoBadge({ peso }: { peso: number }) {
  const colors = ['', '#f1f5f9', '#d5f5f4', '#fed7aa'] // 0, 1, 2, 3
  const textColors = ['', '#64748b', '#0f766e', '#c2410c']
  return (
    <View style={[badge.b, { backgroundColor: colors[peso] || '#f1f5f9' }]}>
      <Text style={[badge.t, { color: textColors[peso] || '#64748b' }]}>{peso}</Text>
    </View>
  )
}

const badge = StyleSheet.create({
  b: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  t: { fontSize: 12, fontWeight: '800' },
})

export default function ControleAtividadesScreen({ navigation, user }: Props) {
  const currentWeek = getISOWeek(new Date())
  const [semana, setSemana] = useState(currentWeek)
  const [data, setData] = useState<ObraControle[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [periodoLabel, setPeriodoLabel] = useState('')
  const [edits, setEdits] = useState<Record<string, { planejado: string; executado: string; observacao: string }>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const load = useCallback(async (sem: string) => {
    try {
      const res = await api.get<ObraControle[]>(`/controle-atividades?semana=${sem}`)
      setData(res)
      if (res.length > 0) {
        setPeriodoLabel(fmtWeekLabel(res[0].periodoInicio, res[0].periodoFim))
      }
      // Seed edits from existing data
      const initial: typeof edits = {}
      res.forEach((o) => o.atividades.forEach((a) => {
        initial[a.id] = {
          planejado: a.percentualPlanejadoSemana > 0 ? String(a.percentualPlanejadoSemana) : '',
          executado: a.percentualExecutadoSemana > 0 ? String(a.percentualExecutadoSemana) : '',
          observacao: a.observacao ?? '',
        }
      }))
      setEdits(initial)
    } catch { }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load(semana) }, [semana])

  const goWeek = (delta: number) => {
    setLoading(true)
    setSemana((prev) => shiftWeek(prev, delta))
  }

  const isCurrentWeek = semana === currentWeek

  const handleEdit = (atId: string, field: 'planejado' | 'executado' | 'observacao', val: string) => {
    setEdits((prev) => ({ ...prev, [atId]: { ...prev[atId], [field]: val } }))
  }

  const saveAtividade = async (at: Atividade) => {
    const e = edits[at.id]
    if (!e) return
    setSaving((p) => ({ ...p, [at.id]: true }))
    try {
      await api.post('/registros-atividades', {
        atividadeObraId: at.id,
        semana,
        percentualPlanejado: parseFloat(e.planejado) || 0,
        percentualExecutado: parseFloat(e.executado) || 0,
        observacao: e.observacao || null,
      })
      load(semana)
    } catch (err: any) { Alert.alert('Erro', err.message) }
    finally { setSaving((p) => ({ ...p, [at.id]: false })) }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Controle de Atividades</Text>
          <Text style={s.headerSub}>{data.length} obra(s)</Text>
        </View>
      </View>

      {/* Week navigator */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => goWeek(-1)} style={s.weekArrow}>
          <Text style={s.weekArrowText}>◀</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.weekLabel}>{semana}{isCurrentWeek ? ' (atual)' : ''}</Text>
          {periodoLabel ? <Text style={s.weekPeriodo}>{periodoLabel}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => goWeek(+1)} style={s.weekArrow}>
          <Text style={s.weekArrowText}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setSemana(currentWeek); setLoading(true) }} style={s.weekToday}>
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

              <View style={s.evolucaoBarRow}>
                <ProgressBar value={item.evolucaoPonderada} color={item.evolucaoPonderada >= 70 ? '#22c55e' : '#5165A8'} />
              </View>

              {item.atividades.length === 0 ? (
                <Text style={s.noAtiv}>Sem atividades cadastradas</Text>
              ) : (
                <View style={s.atividades}>
                  {item.atividades.map((at) => {
                    const e = edits[at.id] ?? { planejado: '', executado: '', observacao: '' }
                    const execVal = parseFloat(e.executado) || at.percentualExecutadoSemana
                    const planVal = parseFloat(e.planejado) || at.percentualPlanejadoSemana
                    const acumFill = at.percentualAcumuladoAtual
                    const isSaving = saving[at.id]
                    return (
                      <View key={at.id} style={s.atCard}>
                        {/* Top: nome + peso */}
                        <View style={s.atTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.atNome}>{at.nome}</Text>
                            {at.descricao && <Text style={s.atDesc} numberOfLines={1}>{at.descricao}</Text>}
                            {at.unidade && <Text style={s.atUnit}>({at.unidade})</Text>}
                          </View>
                          <PesoBadge peso={at.peso} />
                        </View>

                        {/* Percentual bars (read-only for non-current weeks) */}
                        {isCurrentWeek ? (
                          <View style={s.editRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.editLabel}>Planejado %</Text>
                              <TextInput
                                style={s.editInput}
                                value={e.planejado}
                                onChangeText={(v) => handleEdit(at.id, 'planejado', v)}
                                keyboardType="decimal-pad"
                                placeholder={String(at.percentualPlanejadoSemana || 0)}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.editLabel}>Executado %</Text>
                              <TextInput
                                style={[s.editInput, { color: execVal >= planVal ? '#16a34a' : '#dc2626' }]}
                                value={e.executado}
                                onChangeText={(v) => handleEdit(at.id, 'executado', v)}
                                keyboardType="decimal-pad"
                                placeholder={String(at.percentualExecutadoSemana || 0)}
                              />
                            </View>
                          </View>
                        ) : (
                          <View style={s.statsRow}>
                            <View style={s.statPill}>
                              <Text style={s.statPillLabel}>Ant.</Text>
                              <Text style={s.statPillValue}>{at.percentualAcumuladoAnterior}%</Text>
                            </View>
                            <View style={s.statPill}>
                              <Text style={s.statPillLabel}>Plan.</Text>
                              <Text style={[s.statPillValue, { color: '#5165A8' }]}>{at.percentualPlanejadoSemana}%</Text>
                            </View>
                            <View style={s.statPill}>
                              <Text style={s.statPillLabel}>Exec.</Text>
                              <Text style={[s.statPillValue, { color: at.percentualExecutadoSemana >= at.percentualPlanejadoSemana ? '#22c55e' : '#f59e0b' }]}>
                                {at.percentualExecutadoSemana}%
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Acumulado + progress bar */}
                        <View style={s.acumRow}>
                          <Text style={s.acumLabel}>Acumulado Atual</Text>
                          <Text style={[s.acumValue, { color: acumFill >= 100 ? '#22c55e' : '#5165A8' }]}>{acumFill}%</Text>
                        </View>
                        <ProgressBar value={acumFill} color={acumFill >= 100 ? '#22c55e' : execVal >= planVal ? '#3BBDB8' : '#5165A8'} />

                        {/* Observação + Save (current week only) */}
                        {isCurrentWeek && (
                          <>
                            <TextInput
                              style={s.obsInput}
                              value={e.observacao}
                              onChangeText={(v) => handleEdit(at.id, 'observacao', v)}
                              placeholder="Observação (opcional)"
                            />
                            <TouchableOpacity
                              style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
                              onPress={() => saveAtividade(at)}
                              disabled={isSaving}>
                              <Text style={s.saveBtnText}>{isSaving ? 'Salvando...' : '💾 Salvar'}</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {/* Obs (read-only) */}
                        {!isCurrentWeek && at.observacao && (
                          <Text style={s.obsReadonly}>{at.observacao}</Text>
                        )}
                      </View>
                    )
                  })}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0f172a' },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 12 },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
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
  obraCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2 },
  obraHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  obraNome: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  obraCliente: { fontSize: 12, color: '#64748b' },
  evolucaoBadge: { alignItems: 'flex-end', marginLeft: 8 },
  evolucaoLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' },
  evolucaoValue: { fontSize: 20, fontWeight: '800' },
  evolucaoBarRow: { marginBottom: 12 },
  noAtiv: { color: '#94a3b8', fontSize: 13, fontStyle: 'italic' },
  atividades: { gap: 10 },
  atCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  atTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  atNome: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  atDesc: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  atUnit: { fontSize: 11, color: '#64748b' },
  editRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  editLabel: { fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4 },
  editInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontWeight: '700', color: '#1e293b', backgroundColor: '#fff' },
  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statPill: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 6, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statPillLabel: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 },
  statPillValue: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  acumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  acumLabel: { fontSize: 11, color: '#64748b' },
  acumValue: { fontSize: 13, fontWeight: '800' },
  obsInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1e293b', backgroundColor: '#fff', marginTop: 8 },
  saveBtn: { backgroundColor: '#5165A8', borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  obsReadonly: { color: '#94a3b8', fontSize: 12, fontStyle: 'italic', marginTop: 4 },
})
