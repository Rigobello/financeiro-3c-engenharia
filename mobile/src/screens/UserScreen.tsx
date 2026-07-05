import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Image, ActivityIndicator, Modal,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { logout, SessionUser } from '../lib/auth'
import { api } from '../lib/api'

interface Obra { id: string; nome: string }
interface DadosOCR {
  nomeEstabelecimento: string
  data: string | null
  cnpj: string | null
  total: number
  itens: { descricao: string; valor: number }[]
  textoCompleto: string
}

interface Props {
  navigation: any
  user: SessionUser
  onLogout: () => void
}

export default function UserScreen({ navigation, user, onLogout }: Props) {
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [dados, setDados] = useState<DadosOCR | null>(null)
  const [modalOCR, setModalOCR] = useState(false)

  useEffect(() => {
    api.get<Obra[]>('/obras')
      .then((data) => setObras(data.filter((o: any) => o.status === 'em_andamento')))
      .catch(() => {})
  }, [])

  const pickImage = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Conceda permissão nas configurações do dispositivo.')
      return
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setPhoto(asset.uri)
      setDados(null)

      if (asset.base64) {
        processarOCR(asset.base64)
      }
    }
  }

  const processarOCR = async (base64: string) => {
    setProcessing(true)
    try {
      const res = await api.post<any>('/ocr', {
        imageBase64: base64,
        obraId: selectedObra?.id || null,
      })

      if (res.dados) {
        setDados(res.dados)
        setModalOCR(true)
      } else {
        Alert.alert('OCR', 'Não foi possível extrair dados. Tente uma foto mais nítida.')
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao processar imagem')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout()
          onLogout()
          navigation.replace('Login')
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Olá, {user.name.split(' ')[0]}</Text>
          <Text style={styles.headerSub}>Envio de Recibos</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Selecionar Obra */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Obras em Andamento</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.obraList}>
            {obras.map((o) => (
              <TouchableOpacity
                key={o.id}
                onPress={() => setSelectedObra(selectedObra?.id === o.id ? null : o)}
                style={[styles.obraChip, selectedObra?.id === o.id && styles.obraChipActive]}
              >
                <Text style={[styles.obraChipText, selectedObra?.id === o.id && styles.obraChipTextActive]}>
                  {o.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedObra && (
            <Text style={styles.obraSelected}>✓ {selectedObra.nome}</Text>
          )}
        </View>

        {/* Foto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto do Recibo / Nota Fiscal</Text>

          {photo ? (
            <View>
              <Image source={{ uri: photo }} style={styles.photoPreview} />
              {processing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator color="#5165A8" size="large" />
                  <Text style={styles.processingText}>Analisando nota fiscal...</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>📄</Text>
              <Text style={styles.photoPlaceholderText}>Nenhuma foto selecionada</Text>
            </View>
          )}

          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(true)}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.photoBtn, styles.photoBtnSecondary]} onPress={() => pickImage(false)}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnText}>Galeria</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dados OCR */}
        {dados && (
          <TouchableOpacity style={styles.resultCard} onPress={() => setModalOCR(true)}>
            <Text style={styles.resultTitle}>✅ Nota processada!</Text>
            <Text style={styles.resultText}>{dados.nomeEstabelecimento}</Text>
            <Text style={styles.resultTotal}>{formatCurrency(dados.total)}</Text>
            <Text style={styles.resultTap}>Toque para ver detalhes</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal OCR */}
      <Modal visible={modalOCR} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dados da Nota Fiscal</Text>
            <TouchableOpacity onPress={() => setModalOCR(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {dados && (
            <ScrollView style={styles.modalContent}>
              <InfoRow label="Estabelecimento" value={dados.nomeEstabelecimento} />
              {dados.data && <InfoRow label="Data" value={dados.data} />}
              {dados.cnpj && <InfoRow label="CNPJ" value={dados.cnpj} />}
              {selectedObra && <InfoRow label="Obra" value={selectedObra.nome} />}

              {dados.itens.length > 0 && (
                <View style={styles.itensSection}>
                  <Text style={styles.itensTitle}>Itens</Text>
                  {dados.itens.map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemDesc} numberOfLines={2}>{item.descricao}</Text>
                      <Text style={styles.itemValor}>{formatCurrency(item.valor)}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>{formatCurrency(dados.total)}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  )
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { color: '#64748b', fontSize: 13 },
  value: { color: '#1e293b', fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
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
  content: { padding: 20, gap: 20 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  obraList: { marginBottom: 8 },
  obraChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 2, borderColor: 'transparent',
  },
  obraChipActive: { backgroundColor: '#eef1f8', borderColor: '#5165A8' },
  obraChipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  obraChipTextActive: { color: '#5165A8' },
  obraSelected: { color: '#5165A8', fontSize: 13, fontWeight: '600', marginTop: 4 },
  photoPlaceholder: {
    height: 160, backgroundColor: '#f8fafc', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
    borderStyle: 'dashed', borderColor: '#e2e8f0',
  },
  photoPlaceholderIcon: { fontSize: 40, marginBottom: 8 },
  photoPlaceholderText: { color: '#94a3b8', fontSize: 14 },
  photoPreview: { width: '100%', height: 220, borderRadius: 12, resizeMode: 'cover' },
  processingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(248,250,252,0.9)', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
  },
  processingText: { color: '#5165A8', marginTop: 8, fontWeight: '600' },
  photoButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  photoBtn: {
    flex: 1, backgroundColor: '#5165A8', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  photoBtnSecondary: { backgroundColor: '#1e293b' },
  photoBtnIcon: { fontSize: 22, marginBottom: 4 },
  photoBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  resultCard: {
    backgroundColor: '#ecfdf5', borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#22c55e',
  },
  resultTitle: { fontSize: 15, fontWeight: '700', color: '#15803d', marginBottom: 4 },
  resultText: { color: '#374151', fontSize: 14 },
  resultTotal: { fontSize: 22, fontWeight: '800', color: '#15803d', marginTop: 4 },
  resultTap: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#94a3b8' },
  modalContent: { flex: 1, padding: 20 },
  itensSection: { marginTop: 16 },
  itensTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  itemDesc: { color: '#374151', fontSize: 13, flex: 1, marginRight: 8 },
  itemValor: { color: '#1e293b', fontSize: 13, fontWeight: '600' },
  totalBox: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#475569' },
  totalValue: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
})
