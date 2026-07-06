import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Modal, ActivityIndicator, TextInput,
} from 'react-native'
import { api } from '../lib/api'
import { SessionUser, isAdmin } from '../lib/auth'

interface LocalEstoque { local: string; nome: string; quantidade: number }
interface Material {
  id: string; nome: string; codigo: string | null; categoria: string | null
  unidade: string; quantidadeTotal: number; locais: LocalEstoque[]
}
interface Obra { id: string; nome: string; status: string }

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

const UNIDADES = ['un', 'kg', 'g', 'lt', 'm', 'm²', 'm³', 'cx', 'pç', 'bd', 'sc']
const CATEGORIAS_MAT = ['ferramenta', 'consumivel', 'epi', 'material_construcao', 'eletrico', 'hidraulico', 'outros']
const CAT_LABEL: Record<string, string> = {
  ferramenta: 'Ferramenta', consumivel: 'Consumível', epi: 'EPI',
  material_construcao: 'Material de Construção', eletrico: 'Elétrico',
  hidraulico: 'Hidráulico', outros: 'Outros',
}

export default function AlmoxarifadoScreen({ navigation, user }: Props) {
  const [materiais, setMateriais] = useState<Material[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal movimentação
  const [modalMov, setModalMov] = useState(false)
  const [selMaterial, setSelMaterial] = useState<Material | null>(null)
  const [origemId, setOrigemId] = useState<string | null>(null)
  const [destinoId, setDestinoId] = useState<string | null>(null)
  const [quantidade, setQuantidade] = useState('1')
  const [responsavelNome, setResponsavelNome] = useState('')
  const [obs, setObs] = useState('')
  const [pickMat, setPickMat] = useState(false)
  const [pickOrigem, setPickOrigem] = useState(false)
  const [pickDestino, setPickDestino] = useState(false)

  // Modal novo material
  const [modalNewMat, setModalNewMat] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [newCodigo, setNewCodigo] = useState('')
  const [newCategoria, setNewCategoria] = useState('')
  const [newUnidade, setNewUnidade] = useState('un')
  const [newQtdInicial, setNewQtdInicial] = useState('0')
  const [savingMat, setSavingMat] = useState(false)
  const [pickUnidade, setPickUnidade] = useState(false)
  const [pickCategoria, setPickCategoria] = useState(false)

  const load = async () => {
    try {
      const [mats, obs] = await Promise.all([
        api.get<Material[]>('/materiais'),
        api.get<Obra[]>('/obras'),
      ])
      setMateriais(mats)
      setObras(obs)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openMov = (m?: Material) => {
    setSelMaterial(m ?? null)
    setOrigemId(null); setDestinoId(null)
    setQuantidade('1'); setObs(''); setResponsavelNome('')
    setModalMov(true)
  }

  const openNewMat = () => {
    setNewNome(''); setNewCodigo(''); setNewCategoria('')
    setNewUnidade('un'); setNewQtdInicial('0')
    setModalNewMat(true)
  }

  const registrar = async () => {
    if (!selMaterial) { Alert.alert('Atenção', 'Selecione o material'); return }
    if (origemId === destinoId) { Alert.alert('Atenção', 'Origem e destino não podem ser iguais'); return }
    if (!quantidade || Number(quantidade) < 1) { Alert.alert('Atenção', 'Informe uma quantidade válida'); return }
    setSaving(true)
    try {
      await api.post('/movimentacoes', {
        materialId: selMaterial.id,
        obraOrigemId: origemId || undefined,
        obraDestinoId: destinoId || undefined,
        quantidade: Number(quantidade),
        data: new Date().toISOString().slice(0, 10),
        responsavelNome: responsavelNome || undefined,
        observacao: obs || undefined,
      })
      setModalMov(false)
      await load()
      Alert.alert('Registrado!', `${Number(quantidade)} ${selMaterial.unidade} de ${selMaterial.nome} movimentado(s).`)
    } catch (err: any) { Alert.alert('Erro', err.message) }
    finally { setSaving(false) }
  }

  const criarMaterial = async () => {
    if (!newNome.trim()) { Alert.alert('Atenção', 'Nome é obrigatório'); return }
    setSavingMat(true)
    try {
      await api.post('/materiais', {
        nome: newNome.trim(),
        codigo: newCodigo.trim() || undefined,
        categoria: newCategoria || undefined,
        unidade: newUnidade,
        quantidadeInicial: parseFloat(newQtdInicial) || 0,
      })
      setModalNewMat(false)
      await load()
      Alert.alert('Criado!', `Material "${newNome}" criado com sucesso.`)
    } catch (err: any) { Alert.alert('Erro', err.message) }
    finally { setSavingMat(false) }
  }

  const localNome = (id: string | null) => id ? obras.find((o) => o.id === id)?.nome ?? id : 'Depósito'

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Almoxarifado</Text>
          <Text style={s.headerSub}>{materiais.length} materiais</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isAdmin(user) && (
            <TouchableOpacity style={[s.addBtn, { backgroundColor: '#3D4D80' }]} onPress={openNewMat}>
              <Text style={s.addBtnText}>+ Material</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.addBtn} onPress={() => openMov()}>
            <Text style={s.addBtnText}>→ Mover</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#5165A8" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          <Text style={s.sectionLabel}>Estoque Atual</Text>
          {materiais.length === 0 && (
            <View style={s.empty}><Text style={s.emptyIcon}>📦</Text><Text style={s.emptyText}>Nenhum material cadastrado</Text></View>
          )}
          {materiais.map((m) => (
            <View key={m.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={s.cardIcon}><Text style={s.cardIconText}>📦</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.matNome}>{m.nome}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    {m.codigo && <Text style={s.chipCode}>{m.codigo}</Text>}
                    {m.categoria && <Text style={s.chipCat}>{CAT_LABEL[m.categoria] || m.categoria}</Text>}
                    <Text style={s.chipTotal}>{m.quantidadeTotal} {m.unidade} total</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.movBtn} onPress={() => openMov(m)}>
                  <Text style={s.movBtnText}>→ Mover</Text>
                </TouchableOpacity>
              </View>
              <View style={s.locais}>
                {m.locais.map((l) => (
                  <View key={l.local} style={[s.localChip, l.local !== 'deposito' && s.localChipObra]}>
                    <Text style={[s.localChipText, l.local !== 'deposito' && s.localChipTextObra]}>
                      {l.nome}: {l.quantidade} {m.unidade}
                    </Text>
                  </View>
                ))}
                {m.locais.length === 0 && <Text style={s.noLocal}>Sem estoque</Text>}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal Movimentação */}
      <Modal visible={modalMov} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Movimentar Material</Text>
            <TouchableOpacity onPress={() => setModalMov(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={s.label}>Material *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickMat(true)}>
              <Text style={[s.pickerText, !selMaterial && s.pickerPh]}>{selMaterial ? selMaterial.nome : 'Selecione...'}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>
            {selMaterial && selMaterial.locais.length > 0 && (
              <View style={s.stockInfo}>
                {selMaterial.locais.map((l) => (
                  <Text key={l.local} style={s.stockText}>{l.nome}: {l.quantidade} {selMaterial.unidade}</Text>
                ))}
              </View>
            )}

            <Text style={s.label}>Origem</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickOrigem(true)}>
              <Text style={s.pickerText}>{localNome(origemId)}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Destino</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickDestino(true)}>
              <Text style={s.pickerText}>{localNome(destinoId)}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Quantidade *</Text>
            <TextInput style={s.textInput} value={quantidade} onChangeText={setQuantidade} keyboardType="numeric" placeholder="1" />

            <Text style={s.label}>Responsável</Text>
            <TextInput style={s.textInput} value={responsavelNome} onChangeText={setResponsavelNome} placeholder="Nome do responsável" />

            <Text style={s.label}>Observação</Text>
            <TextInput style={s.textInput} value={obs} onChangeText={setObs} placeholder="Opcional" multiline />

            <TouchableOpacity style={[s.confirmBtn, saving && s.confirmBtnDisabled]} onPress={registrar} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Confirmar Movimentação</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Novo Material */}
      <Modal visible={modalNewMat} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Novo Material</Text>
            <TouchableOpacity onPress={() => setModalNewMat(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={s.label}>Nome *</Text>
            <TextInput style={s.textInput} value={newNome} onChangeText={setNewNome} placeholder="Nome do material" />

            <Text style={s.label}>Código (opcional)</Text>
            <TextInput style={s.textInput} value={newCodigo} onChangeText={setNewCodigo} placeholder="Ex: MAT-001" />

            <Text style={s.label}>Categoria</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickCategoria(true)}>
              <Text style={[s.pickerText, !newCategoria && s.pickerPh]}>{newCategoria ? CAT_LABEL[newCategoria] : 'Selecione (opcional)...'}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Unidade *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setPickUnidade(true)}>
              <Text style={s.pickerText}>{newUnidade}</Text>
              <Text style={s.pickerChev}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>Quantidade Inicial</Text>
            <TextInput style={s.textInput} value={newQtdInicial} onChangeText={setNewQtdInicial} keyboardType="decimal-pad" placeholder="0" />

            <TouchableOpacity style={[s.confirmBtn, { backgroundColor: '#3D4D80' }, savingMat && s.confirmBtnDisabled]} onPress={criarMaterial} disabled={savingMat}>
              {savingMat ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>Criar Material</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Material */}
      <Modal visible={pickMat} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Material</Text><TouchableOpacity onPress={() => setPickMat(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{materiais.map((m) => (
            <TouchableOpacity key={m.id} style={s.pickItem} onPress={() => { setSelMaterial(m); setPickMat(false) }}>
              <Text style={s.pickTitle}>{m.nome}</Text>
              <Text style={s.pickSub}>{m.quantidadeTotal} {m.unidade} · {m.categoria ? (CAT_LABEL[m.categoria] || m.categoria) : 'Sem categoria'}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Origem */}
      <Modal visible={pickOrigem} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Origem</Text><TouchableOpacity onPress={() => setPickOrigem(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{[{ id: null, nome: 'Depósito' }, ...obras].map((loc) => (
            <TouchableOpacity key={loc.id ?? 'dep'} style={s.pickItem} onPress={() => { setOrigemId(loc.id); setPickOrigem(false) }}>
              <Text style={s.pickTitle}>{loc.nome}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Destino */}
      <Modal visible={pickDestino} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Destino</Text><TouchableOpacity onPress={() => setPickDestino(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{[{ id: null, nome: 'Depósito' }, ...obras].map((loc) => (
            <TouchableOpacity key={loc.id ?? 'dep'} style={s.pickItem} onPress={() => { setDestinoId(loc.id); setPickDestino(false) }}>
              <Text style={s.pickTitle}>{loc.nome}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Unidade */}
      <Modal visible={pickUnidade} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Unidade</Text><TouchableOpacity onPress={() => setPickUnidade(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>{UNIDADES.map((u) => (
            <TouchableOpacity key={u} style={s.pickItem} onPress={() => { setNewUnidade(u); setPickUnidade(false) }}>
              <Text style={s.pickTitle}>{u}</Text>
            </TouchableOpacity>
          ))}</ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Picker Categoria (novo material) */}
      <Modal visible={pickCategoria} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Categoria</Text><TouchableOpacity onPress={() => setPickCategoria(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity></View>
          <ScrollView>
            <TouchableOpacity style={s.pickItem} onPress={() => { setNewCategoria(''); setPickCategoria(false) }}>
              <Text style={s.pickTitle}>Sem categoria</Text>
            </TouchableOpacity>
            {CATEGORIAS_MAT.map((c) => (
              <TouchableOpacity key={c} style={s.pickItem} onPress={() => { setNewCategoria(c); setPickCategoria(false) }}>
                <Text style={s.pickTitle}>{CAT_LABEL[c]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0f172a' },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 12 },
  addBtn: { backgroundColor: '#3BBDB8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  sectionLabel: { color: '#64748b', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardIcon: { width: 40, height: 40, backgroundColor: '#eef1f8', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardIconText: { fontSize: 20 },
  matNome: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  chipCode: { backgroundColor: '#f1f5f9', color: '#475569', fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chipCat: { backgroundColor: '#f1f5f9', color: '#475569', fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chipTotal: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  movBtn: { backgroundColor: '#eef1f8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  movBtnText: { color: '#5165A8', fontSize: 12, fontWeight: '700' },
  locais: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  localChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  localChipObra: { backgroundColor: '#eef1f8', borderWidth: 1, borderColor: '#d5dced' },
  localChipText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  localChipTextObra: { color: '#3D4D80' },
  noLocal: { color: '#94a3b8', fontSize: 12 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#94a3b8' },
  modalContent: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  picker: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  pickerText: { fontSize: 15, color: '#1e293b', flex: 1 },
  pickerPh: { color: '#94a3b8' },
  pickerChev: { color: '#94a3b8', fontSize: 16 },
  stockInfo: { backgroundColor: '#eef1f8', borderRadius: 10, padding: 10, marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stockText: { color: '#3D4D80', fontSize: 13, fontWeight: '600' },
  textInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc' },
  confirmBtn: { backgroundColor: '#3BBDB8', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pickItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  pickSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
})
