import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser } from '../lib/auth'

interface Resumo {
  funcionariosAtivos: number
  obrasAtivas: number
  totalPagamentos: number
  totalAdiantamentos: number
  pontosPagos: number
  pontosAguardandoPagamento: number
  pontosEmAberto: number
  solicitacoesPendentes: number
}

interface ObraConsolidado {
  id: string; nome: string; cliente: string; orcamento: number
  custos: number; receitas: number; saldo: number; funcionarios: number
}

interface SolicitacaoPendente {
  id: string; funcionario: string; obra: string; valor: number; motivo: string; criadoEm: string
}

interface MaterialConsolidado {
  id: string; nome: string; unidade: string
  locais: { nome: string; quantidade: number }[]
}

interface Consolidado {
  geradoEm: string
  resumo: Resumo
  obras: ObraConsolidado[]
  materiais: MaterialConsolidado[]
  solicitacoesPendentes: SolicitacaoPendente[]
}

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

export default function ConsolidadoScreen({ navigation, user }: Props) {
  const [data, setData] = useState<Consolidado | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get<Consolidado>('/consolidado')
      setData(res)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [])

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Consolidado Geral</Text>
          {data && (
            <Text style={s.headerSub}>
              Gerado {new Date(data.geradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : !data ? (
        <View style={s.center}><Text style={s.errorText}>Erro ao carregar dados</Text></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#5165A8" />}
        >
          {/* Resumo Geral */}
          <Text style={s.sectionTitle}>Resumo Geral</Text>
          <View style={s.statsGrid}>
            <StatCard icon="🏗️" label="Obras Ativas" value={String(data.resumo.obrasAtivas)} color="#5165A8" />
            <StatCard icon="👷" label="Funcionários" value={String(data.resumo.funcionariosAtivos)} color="#3BBDB8" />
            <StatCard icon="💰" label="Total Pagamentos" value={fmt(data.resumo.totalPagamentos)} color="#22c55e" />
            <StatCard icon="🔄" label="Adiantamentos" value={fmt(data.resumo.totalAdiantamentos)} color="#f59e0b" />
            <StatCard icon="✅" label="Pontos Pagos" value={String(data.resumo.pontosPagos)} color="#22c55e" />
            <StatCard icon="⏳" label="Aguard. Pagamento" value={String(data.resumo.pontosAguardandoPagamento)} color="#f59e0b" />
            <StatCard icon="📋" label="Pontos Em Aberto" value={String(data.resumo.pontosEmAberto)} color="#64748b" />
            <StatCard icon="🔔" label="Solic. Pendentes" value={String(data.resumo.solicitacoesPendentes)} color={data.resumo.solicitacoesPendentes > 0 ? '#ef4444' : '#22c55e'} />
          </View>

          {/* Obras */}
          {data.obras.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Obras em Andamento</Text>
              {data.obras.map((obra) => (
                <View key={obra.id} style={s.obraCard}>
                  <View style={s.obraTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.obraNome}>{obra.nome}</Text>
                      <Text style={s.obraCliente}>{obra.cliente}</Text>
                    </View>
                    <View style={s.obraMeta}>
                      <Text style={s.obraFuncionarios}>👷 {obra.funcionarios}</Text>
                    </View>
                  </View>
                  <View style={s.obraFinanceiro}>
                    <View style={s.obraFinItem}>
                      <Text style={s.obraFinLabel}>Orçamento</Text>
                      <Text style={s.obraFinValue}>{fmt(obra.orcamento)}</Text>
                    </View>
                    <View style={s.obraFinItem}>
                      <Text style={s.obraFinLabel}>Receitas</Text>
                      <Text style={[s.obraFinValue, { color: '#22c55e' }]}>{fmt(obra.receitas)}</Text>
                    </View>
                    <View style={s.obraFinItem}>
                      <Text style={s.obraFinLabel}>Custos</Text>
                      <Text style={[s.obraFinValue, { color: '#ef4444' }]}>{fmt(obra.custos)}</Text>
                    </View>
                    <View style={s.obraFinItem}>
                      <Text style={s.obraFinLabel}>Saldo</Text>
                      <Text style={[s.obraFinValue, s.obraFinSaldo, { color: obra.saldo >= 0 ? '#5165A8' : '#ef4444' }]}>
                        {fmt(obra.saldo)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Solicitações pendentes */}
          {data.solicitacoesPendentes.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Adiantamentos Pendentes</Text>
              {data.solicitacoesPendentes.map((sol) => (
                <View key={sol.id} style={s.solCard}>
                  <View style={s.solTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.solNome}>{sol.funcionario}</Text>
                      <Text style={s.solObra}>{sol.obra}</Text>
                    </View>
                    <Text style={s.solValor}>{fmt(sol.valor)}</Text>
                  </View>
                  <Text style={s.solMotivo}>"{sol.motivo}"</Text>
                  <Text style={s.solDate}>{fmtDate(sol.criadoEm)}</Text>
                </View>
              ))}
            </>
          )}

          {/* Materiais */}
          {data.materiais.filter((m) => m.locais.length > 0).length > 0 && (
            <>
              <Text style={s.sectionTitle}>Estoque de Materiais</Text>
              {data.materiais.filter((m) => m.locais.length > 0).map((mat) => (
                <View key={mat.id} style={s.matCard}>
                  <Text style={s.matNome}>{mat.nome}</Text>
                  <View style={s.matLocais}>
                    {mat.locais.map((loc) => (
                      <View key={loc.nome} style={s.matChip}>
                        <Text style={s.matChipText}>{loc.nome}: {loc.quantidade} {mat.unidade}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[cs.card, { borderTopColor: color }]}>
      <Text style={cs.icon}>{icon}</Text>
      <Text style={[cs.value, { color }]}>{value}</Text>
      <Text style={cs.label}>{label}</Text>
    </View>
  )
}

const cs = StyleSheet.create({
  card: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, borderTopWidth: 3, elevation: 1,
  },
  icon: { fontSize: 22, marginBottom: 4 },
  value: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 11, color: '#64748b', fontWeight: '600' },
})

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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#ef4444', fontSize: 15 },
  content: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  obraCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    elevation: 1, borderLeftWidth: 4, borderLeftColor: '#5165A8',
  },
  obraTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  obraNome: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  obraCliente: { fontSize: 12, color: '#64748b' },
  obraMeta: { alignItems: 'flex-end' },
  obraFuncionarios: { fontSize: 12, color: '#64748b' },
  obraFinanceiro: { flexDirection: 'row', gap: 8 },
  obraFinItem: { flex: 1 },
  obraFinLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 1 },
  obraFinValue: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  obraFinSaldo: { fontWeight: '800' },
  solCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    elevation: 1, borderLeftWidth: 4, borderLeftColor: '#f59e0b',
  },
  solTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  solNome: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  solObra: { fontSize: 12, color: '#5165A8', fontWeight: '600' },
  solValor: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  solMotivo: { color: '#64748b', fontSize: 13, fontStyle: 'italic', marginBottom: 4 },
  solDate: { color: '#94a3b8', fontSize: 11 },
  matCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1 },
  matNome: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  matLocais: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  matChip: { backgroundColor: '#eef1f8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  matChipText: { color: '#3D4D80', fontSize: 12, fontWeight: '600' },
})
