import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Modal, TextInput, Alert, Image,
  RefreshControl,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { api } from '../lib/api'
import { SessionUser, isAdmin } from '../lib/auth'
import { SERVER_URL } from '../config'

type Tab = 'lancamentos' | 'pagamentos' | 'fotos' | 'atividades'

const CATEGORIAS = [
  { value: 'material', label: 'Material' },
  { value: 'mao_de_obra', label: 'Mão de Obra' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'servico', label: 'Serviço' },
  { value: 'outros', label: 'Outros' },
]

const TIPOS_PAG = [
  { value: 'salario', label: 'Salário' },
  { value: 'adiantamento', label: 'Adiantamento' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'hora_extra', label: 'Hora Extra' },
  { value: 'outros', label: 'Outros' },
]

interface Lancamento { id: string; tipo: string; valor: number; descricao: string; categoria: string; data: string }
interface Pagamento { id: string; valor: number; tipo: string; data: string; descricao: string | null; funcionario: { nome: string; cargo: string } }
interface ObraDetail {
  id: string; nome: string; cliente: string; endereco: string | null
  cidade: string | null; dataInicio: string; dataFim: string | null
  status: string; orcamento: number; saldo: number
  totalEntradas: number; totalSaidas: number; totalPagamentos: number
  lancamentos: Lancamento[]
  pagamentos: Pagamento[]
}
interface Atividade { id: string; nome: string; descricao: string | null; peso: number; unidade: string | null; ordem: number; status: string }
interface FotoObra { id: string; imagemPath: string; descricao: string | null; dataRegistro: string; user: { name: string } }
interface Funcionario { id: string; nome: string; cargo: string }

interface Props { navigation: any; route: any; user: SessionUser; onLogout: () => void }

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (d: string) => new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
const today = () => new Date().toISOString().slice(0, 10)

const STATUS_LABEL: Record<string, string> = { em_andamento: 'Em Andamento', concluida: 'Concluída', pausada: 'Pausada', cancelada: 'Cancelada' }
const STATUS_COLOR: Record<string, string> = { em_andamento: '#22c55e', concluida: '#5165A8', pausada: '#f59e0b', cancelada: '#ef4444' }

export default function ObraDetailScreen({ navigation, route, user }: Props) {
  const obraId: string = route.params?.obraId

  const [obra, setObra] = useState<ObraDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<Tab>('lancamentos')
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [fotos, setFotos] = useState<FotoObra[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])

  // Lancamento modal
  const [modalLanc, setModalLanc] = useState(false)
  const [lancTipo, setLancTipo] = useState<'saida' | 'entrada'>('saida')
  const [lancDesc, setLancDesc] = useState('')
  const [lancValor, setLancValor] = useState('')
  const [lancData, setLancData] = useState(today())
  const [lancCategoria, setLancCategoria] = useState('material')
  const [pickCategoria, setPickCategoria] = useState(false)
  const [savingLanc, setSavingLanc] = useState(false)

  // Pagamento modal
  const [modalPag, setModalPag] = useState(false)
  const [pagFuncId, setPagFuncId] = useState('')
  const [pagTipo, setPagTipo] = useState('salario')
  const [pagValor, setPagValor] = useState('')
  const [pagData, setPagData] = useState(today())
  const [pagDesc, setPagDesc] = useState('')
  const [pickFunc, setPickFunc] = useState(false)
  const [pickTipoPag, setPickTipoPag] = useState(false)
  const [savingPag, setSavingPag] = useState(false)

  // Atividade modal
  const [modalAtiv, setModalAtiv] = useState(false)
  const [editAtiv, setEditAtiv] = useState<Atividade | null>(null)
  const [ativNome, setAtivNome] = useState('')
  const [ativDesc, setAtivDesc] = useState('')
  const [ativPeso, setAtivPeso] = useState(2)
  const [ativUnidade, setAtivUnidade] = useState('')
  const [savingAtiv, setSavingAtiv] = useState(false)

  // Foto
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)

  const loadObra = useCallback(async () => {
    try {
      const [obraData, ativsData, fotosData, funcsData] = await Promise.all([
        api.get<ObraDetail>(`/obras/${obraId}`),
        api.get<Atividade[]>(`/obras/${obraId}/atividades`),
        api.get<FotoObra[]>(`/obras/${obraId}/fotos`),
        api.get<any[]>('/funcionarios'),
      ])
      setObra(obraData)
      setAtividades(ativsData)
      setFotos(fotosData)
      setFuncionarios(funcsData.filter((f) => f.status === 'ativo'))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [obraId])

  useEffect(() => { loadObra() }, [obraId])

  const addLancamento = async () => {
    if (!lancDesc || !lancValor) { Alert.alert('Atenção', 'Preencha descrição e valor'); return }
    setSavingLanc(true)
    try {
      await api.post('/lancamentos', {
        obraId, tipo: lancTipo, descricao: lancDesc,
        valor: parseFloat(lancValor.replace(',', '.')),
        data: lancData, categoria: lancCategoria,
      })
      setModalLanc(false)
      setLancDesc(''); setLancValor(''); setLancData(today()); setLancCategoria('material')
      loadObra()
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSavingLanc(false) }
  }

  const addPagamento = async () => {
    if (!pagFuncId || !pagValor) { Alert.alert('Atenção', 'Preencha funcionário e valor'); return }
    setSavingPag(true)
    try {
      await api.post('/pagamentos', {
        obraId, funcionarioId: pagFuncId, tipo: pagTipo,
        valor: parseFloat(pagValor.replace(',', '.')),
        data: pagData, descricao: pagDesc || null,
      })
      setModalPag(false)
      setPagFuncId(''); setPagValor(''); setPagData(today()); setPagDesc('')
      loadObra()
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSavingPag(false) }
  }

  const deleteLancamento = (id: string) => {
    Alert.alert('Excluir', 'Excluir este lançamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try { await api.del(`/lancamentos/${id}`); loadObra() } catch {}
      }},
    ])
  }

  const deletePagamento = (id: string) => {
    Alert.alert('Excluir', 'Excluir este pagamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try { await api.del(`/pagamentos/${id}`); loadObra() } catch {}
      }},
    ])
  }

  const openNewAtiv = () => {
    setEditAtiv(null); setAtivNome(''); setAtivDesc(''); setAtivPeso(2); setAtivUnidade('')
    setModalAtiv(true)
  }

  const openEditAtiv = (a: Atividade) => {
    setEditAtiv(a); setAtivNome(a.nome); setAtivDesc(a.descricao ?? '')
    setAtivPeso(a.peso); setAtivUnidade(a.unidade ?? '')
    setModalAtiv(true)
  }

  const saveAtividade = async () => {
    if (!ativNome) { Alert.alert('Atenção', 'Informe o nome da atividade'); return }
    setSavingAtiv(true)
    try {
      const body = { nome: ativNome, descricao: ativDesc || null, peso: ativPeso, unidade: ativUnidade || null }
      if (editAtiv) {
        await api.put(`/obras/${obraId}/atividades/${editAtiv.id}`, body)
      } else {
        await api.post(`/obras/${obraId}/atividades`, body)
      }
      setModalAtiv(false)
      const ativsData = await api.get<Atividade[]>(`/obras/${obraId}/atividades`)
      setAtividades(ativsData)
    } catch (e: any) { Alert.alert('Erro', e.message) }
    finally { setSavingAtiv(false) }
  }

  const deleteAtividade = (id: string) => {
    Alert.alert('Inativar', 'Inativar esta atividade?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Inativar', style: 'destructive', onPress: async () => {
        try {
          await api.del(`/obras/${obraId}/atividades/${id}`)
          const ativsData = await api.get<Atividade[]>(`/obras/${obraId}/atividades`)
          setAtividades(ativsData)
        } catch {}
      }},
    ])
  }

  const pickImage = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permissão negada', 'Conceda permissão nas configurações'); return }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.75 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.75 })
    if (!result.canceled && result.assets[0]?.base64) {
      setUploadingFoto(true)
      try {
        await api.post(`/obras/${obraId}/fotos`, {
          imagemBase64: result.assets[0].base64,
          dataRegistro: new Date().toISOString(),
          descricao: null,
        })
        const fotosData = await api.get<FotoObra[]>(`/obras/${obraId}/fotos`)
        setFotos(fotosData)
        Alert.alert('Foto enviada!')
      } catch (e: any) { Alert.alert('Erro', e.message) }
      finally { setUploadingFoto(false) }
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Carregando...</Text>
        </View>
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      </SafeAreaView>
    )
  }

  if (!obra) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Obra não encontrada</Text>
        </View>
      </SafeAreaView>
    )
  }

  const statusColor = STATUS_COLOR[obra.status] || '#64748b'
  const selectedFunc = funcionarios.find((f) => f.id === pagFuncId)
  const selectedCat = CATEGORIAS.find((c) => c.value === lancCategoria)
  const selectedTipoPag = TIPOS_PAG.find((t) => t.value === pagTipo)

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{obra.nome}</Text>
          <Text style={s.headerSub}>{obra.cliente}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: statusColor + '30' }]}>
          <Text style={[s.statusText, { color: statusColor }]}>{STATUS_LABEL[obra.status] || obra.status}</Text>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadObra() }} tintColor="#5165A8" />}
      >
        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Saldo', value: obra.saldo, color: obra.saldo >= 0 ? '#22c55e' : '#ef4444' },
            { label: 'Entradas', value: obra.totalEntradas, color: '#22c55e' },
            { label: 'Saídas', value: obra.totalSaidas, color: '#ef4444' },
            { label: 'Pgtos', value: obra.totalPagamentos, color: '#8b5cf6' },
          ].map((stat) => (
            <View key={stat.label} style={s.statItem}>
              <Text style={s.statLabel}>{stat.label}</Text>
              <Text style={[s.statValue, { color: stat.color }]} numberOfLines={1}>{fmt(stat.value)}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={s.tabBar}>
          {(['lancamentos', 'pagamentos', 'fotos', 'atividades'] as Tab[]).map((t) => (
            <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === 'lancamentos' ? `Lanç.(${obra.lancamentos.length})` :
                 t === 'pagamentos' ? `Pgto.(${obra.pagamentos.length})` :
                 t === 'fotos' ? `Fotos(${fotos.length})` :
                 `Ativ.(${atividades.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action bar */}
        <View style={s.actionRow}>
          {tab === 'lancamentos' && (
            <TouchableOpacity style={s.actionBtn} onPress={() => { setLancTipo('saida'); setModalLanc(true) }}>
              <Text style={s.actionBtnText}>+ Lançamento</Text>
            </TouchableOpacity>
          )}
          {tab === 'pagamentos' && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => setModalPag(true)}>
              <Text style={s.actionBtnText}>+ Pagamento</Text>
            </TouchableOpacity>
          )}
          {tab === 'fotos' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => pickImage(true)} disabled={uploadingFoto}>
                <Text style={s.actionBtnText}>{uploadingFoto ? 'Enviando...' : '📷 Câmera'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#475569' }]} onPress={() => pickImage(false)} disabled={uploadingFoto}>
                <Text style={s.actionBtnText}>🖼️ Galeria</Text>
              </TouchableOpacity>
            </View>
          )}
          {tab === 'atividades' && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#3BBDB8' }]} onPress={openNewAtiv}>
              <Text style={s.actionBtnText}>+ Atividade</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lancamentos */}
        {tab === 'lancamentos' && (
          obra.lancamentos.length === 0
            ? <View style={s.empty}><Text style={s.emptyIcon}>📄</Text><Text style={s.emptyText}>Nenhum lançamento</Text></View>
            : obra.lancamentos.map((l) => (
              <TouchableOpacity key={l.id} style={s.rowItem}
                onLongPress={() => isAdmin(user) && deleteLancamento(l.id)}>
                <View style={[s.typeIndicator, { backgroundColor: l.tipo === 'entrada' ? '#22c55e' : '#ef4444' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{l.descricao}</Text>
                  <Text style={s.rowSub}>{CATEGORIAS.find((c) => c.value === l.categoria)?.label || l.categoria} · {fmtDate(l.data)}</Text>
                </View>
                <Text style={[s.rowValue, { color: l.tipo === 'entrada' ? '#22c55e' : '#ef4444' }]}>
                  {l.tipo === 'entrada' ? '+' : '-'}{fmt(l.valor)}
                </Text>
              </TouchableOpacity>
            ))
        )}

        {/* Pagamentos */}
        {tab === 'pagamentos' && (
          obra.pagamentos.length === 0
            ? <View style={s.empty}><Text style={s.emptyIcon}>💳</Text><Text style={s.emptyText}>Nenhum pagamento</Text></View>
            : obra.pagamentos.map((p) => (
              <TouchableOpacity key={p.id} style={s.rowItem}
                onLongPress={() => isAdmin(user) && deletePagamento(p.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{p.funcionario.nome}</Text>
                  <Text style={s.rowSub}>{TIPOS_PAG.find((t) => t.value === p.tipo)?.label || p.tipo} · {fmtDate(p.data)}</Text>
                </View>
                <Text style={[s.rowValue, { color: '#8b5cf6' }]}>- {fmt(p.valor)}</Text>
              </TouchableOpacity>
            ))
        )}

        {/* Fotos */}
        {tab === 'fotos' && (
          <View style={s.fotosGrid}>
            {fotos.length === 0 && !uploadingFoto
              ? <View style={s.empty}><Text style={s.emptyIcon}>📸</Text><Text style={s.emptyText}>Nenhuma foto{'\n'}Use os botões acima para adicionar</Text></View>
              : (
                <View style={s.photoGrid}>
                  {fotos.map((f) => (
                    <TouchableOpacity key={f.id} style={s.photoThumb} onPress={() => setLightbox(`${SERVER_URL}${f.imagemPath}`)}>
                      <Image source={{ uri: `${SERVER_URL}${f.imagemPath}` }} style={s.photoImg} />
                      <View style={s.photoOverlay}>
                        <Text style={s.photoDate}>{fmtDate(f.dataRegistro)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            }
          </View>
        )}

        {/* Atividades */}
        {tab === 'atividades' && (
          atividades.length === 0
            ? <View style={s.empty}><Text style={s.emptyIcon}>📋</Text><Text style={s.emptyText}>Nenhuma atividade{'\n'}Use "+ Atividade" para cadastrar</Text></View>
            : atividades.map((a, idx) => (
              <View key={a.id} style={s.ativItem}>
                <View style={s.ativNumBadge}><Text style={s.ativNum}>{idx + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.ativNome}>{a.nome}</Text>
                  {a.descricao ? <Text style={s.ativDesc} numberOfLines={1}>{a.descricao}</Text> : null}
                  <View style={s.ativMeta}>
                    <View style={[s.pesoBadge, { backgroundColor: a.peso === 3 ? '#fed7aa' : a.peso === 2 ? '#ccfbf1' : '#f1f5f9' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: a.peso === 3 ? '#9a3412' : a.peso === 2 ? '#134e4a' : '#475569' }}>
                        Peso {a.peso} — {a.peso === 1 ? 'Baixo' : a.peso === 2 ? 'Médio' : 'Alto'}
                      </Text>
                    </View>
                    {a.unidade ? <Text style={s.ativUnidade}>{a.unidade}</Text> : null}
                  </View>
                </View>
                <View style={s.ativActions}>
                  <TouchableOpacity onPress={() => openEditAtiv(a)} style={s.ativActionBtn}>
                    <Text style={{ fontSize: 16 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteAtividade(a.id)} style={s.ativActionBtn}>
                    <Text style={{ fontSize: 16 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Lightbox */}
      {lightbox && (
        <Modal visible animationType="fade">
          <View style={s.lightbox}>
            <TouchableOpacity style={s.lightboxClose} onPress={() => setLightbox(null)}>
              <Text style={s.lightboxCloseText}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: lightbox }} style={s.lightboxImg} resizeMode="contain" />
          </View>
        </Modal>
      )}

      {/* Modal Lancamento */}
      <Modal visible={modalLanc} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Novo Lançamento</Text>
            <TouchableOpacity onPress={() => setModalLanc(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={s.label}>Tipo *</Text>
            <View style={s.tipoRow}>
              {(['saida', 'entrada'] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => setLancTipo(t)}
                  style={[s.tipoBtn, lancTipo === t && (t === 'entrada' ? s.tipoBtnEntrada : s.tipoBtnSaida)]}>
                  <Text style={[s.tipoBtnText, lancTipo === t && { color: '#fff' }]}>
                    {t === 'entrada' ? '▼ Entrada' : '▲ Saída'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Descrição *</Text>
            <TextInput style={s.input} value={lancDesc} onChangeText={setLancDesc} placeholder="Ex: Compra de cimento" />
            <Text style={s.label}>Valor (R$) *</Text>
            <TextInput style={s.input} value={lancValor} onChangeText={setLancValor} keyboardType="decimal-pad" placeholder="0,00" />
            <Text style={s.label}>Data * (AAAA-MM-DD)</Text>
            <TextInput style={s.input} value={lancData} onChangeText={setLancData} placeholder="2024-01-15" />
            <Text style={s.label}>Categoria *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickCategoria(true)}>
              <Text style={s.pickerText}>{selectedCat?.label || 'Selecione...'}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.confirmBtn, savingLanc && s.confirmBtnDisabled]} onPress={addLancamento} disabled={savingLanc}>
              {savingLanc ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Salvar Lançamento</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Categoria */}
      <Modal visible={pickCategoria} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Categoria</Text>
            <TouchableOpacity onPress={() => setPickCategoria(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            {CATEGORIAS.map((c) => (
              <TouchableOpacity key={c.value} style={s.pickItem}
                onPress={() => { setLancCategoria(c.value); setPickCategoria(false) }}>
                <Text style={[s.pickTitle, lancCategoria === c.value && { color: '#5165A8', fontWeight: '800' }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Pagamento */}
      <Modal visible={modalPag} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Novo Pagamento</Text>
            <TouchableOpacity onPress={() => setModalPag(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={s.label}>Funcionário *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickFunc(true)}>
              <Text style={[s.pickerText, !pagFuncId && s.pickerPh]}>
                {selectedFunc ? selectedFunc.nome : 'Selecione...'}
              </Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>
            <Text style={s.label}>Tipo *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickTipoPag(true)}>
              <Text style={s.pickerText}>{selectedTipoPag?.label || 'Selecione...'}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>
            <Text style={s.label}>Valor (R$) *</Text>
            <TextInput style={s.input} value={pagValor} onChangeText={setPagValor} keyboardType="decimal-pad" placeholder="0,00" />
            <Text style={s.label}>Data * (AAAA-MM-DD)</Text>
            <TextInput style={s.input} value={pagData} onChangeText={setPagData} placeholder="2024-01-15" />
            <Text style={s.label}>Observação</Text>
            <TextInput style={s.input} value={pagDesc} onChangeText={setPagDesc} placeholder="Opcional" />
            <TouchableOpacity style={[s.confirmBtn, { backgroundColor: '#8b5cf6' }, savingPag && s.confirmBtnDisabled]} onPress={addPagamento} disabled={savingPag}>
              {savingPag ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Salvar Pagamento</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Funcionário */}
      <Modal visible={pickFunc} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Selecionar Funcionário</Text>
            <TouchableOpacity onPress={() => setPickFunc(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            {funcionarios.map((f) => (
              <TouchableOpacity key={f.id} style={s.pickItem}
                onPress={() => { setPagFuncId(f.id); setPickFunc(false) }}>
                <Text style={s.pickTitle}>{f.nome}</Text>
                <Text style={s.pickSub}>{f.cargo}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Tipo Pagamento */}
      <Modal visible={pickTipoPag} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Tipo de Pagamento</Text>
            <TouchableOpacity onPress={() => setPickTipoPag(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            {TIPOS_PAG.map((t) => (
              <TouchableOpacity key={t.value} style={s.pickItem}
                onPress={() => { setPagTipo(t.value); setPickTipoPag(false) }}>
                <Text style={[s.pickTitle, pagTipo === t.value && { color: '#8b5cf6', fontWeight: '800' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Atividade */}
      <Modal visible={modalAtiv} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{editAtiv ? 'Editar Atividade' : 'Nova Atividade'}</Text>
            <TouchableOpacity onPress={() => setModalAtiv(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={s.label}>Nome *</Text>
            <TextInput style={s.input} value={ativNome} onChangeText={setAtivNome} placeholder="Ex: Fundação, Alvenaria..." />
            <Text style={s.label}>Descrição</Text>
            <TextInput style={s.input} value={ativDesc} onChangeText={setAtivDesc} placeholder="Opcional" />
            <Text style={s.label}>Peso</Text>
            <View style={s.tipoRow}>
              {[1, 2, 3].map((p) => (
                <TouchableOpacity key={p} onPress={() => setAtivPeso(p)}
                  style={[s.tipoBtn, ativPeso === p && { backgroundColor: '#5165A8', borderColor: '#5165A8' }]}>
                  <Text style={[s.tipoBtnText, ativPeso === p && { color: '#fff' }]}>
                    {p} — {p === 1 ? 'Baixo' : p === 2 ? 'Médio' : 'Alto'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Unidade</Text>
            <TextInput style={s.input} value={ativUnidade} onChangeText={setAtivUnidade} placeholder="Ex: m², m³, un (opcional)" />
            <TouchableOpacity style={[s.confirmBtn, { backgroundColor: '#3BBDB8' }, savingAtiv && s.confirmBtnDisabled]} onPress={saveAtividade} disabled={savingAtiv}>
              {savingAtiv ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Salvar Atividade</Text>}
            </TouchableOpacity>
          </ScrollView>
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
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
  headerSub: { color: '#94a3b8', fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: '#1e293b', paddingHorizontal: 8, paddingVertical: 10 },
  statItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statLabel: { color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  statValue: { color: '#fff', fontSize: 11, fontWeight: '800' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#5165A8' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#5165A8' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f8fafc' },
  actionBtn: { backgroundColor: '#5165A8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  typeIndicator: { width: 4, height: 40, borderRadius: 2 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  rowSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  rowValue: { fontSize: 14, fontWeight: '800' },
  fotosGrid: { padding: 16 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: '30.5%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  photoImg: { width: '100%', height: '100%' },
  photoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4 },
  photoDate: { color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  ativItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  ativNumBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eef1f8', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  ativNum: { color: '#5165A8', fontSize: 12, fontWeight: '800' },
  ativNome: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  ativDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  ativMeta: { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' },
  pesoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  ativUnidade: { fontSize: 11, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ativActions: { flexDirection: 'row', gap: 4, paddingTop: 2 },
  ativActionBtn: { padding: 4 },
  empty: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff' },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  lightbox: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  lightboxCloseText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  lightboxImg: { width: '100%', height: '80%' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#94a3b8' },
  modalContent: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc' },
  tipoRow: { flexDirection: 'row', gap: 10 },
  tipoBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center' },
  tipoBtnEntrada: { borderColor: '#22c55e', backgroundColor: '#22c55e' },
  tipoBtnSaida: { borderColor: '#ef4444', backgroundColor: '#ef4444' },
  tipoBtnText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  picker: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  pickerText: { fontSize: 15, color: '#1e293b' },
  pickerPh: { color: '#94a3b8' },
  pickerChev: { color: '#94a3b8', fontSize: 16 },
  confirmBtn: { backgroundColor: '#5165A8', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pickItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  pickSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
})
