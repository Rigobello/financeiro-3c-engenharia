import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, Image, ActivityIndicator, TextInput, Modal,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { api } from '../lib/api'
import { SessionUser } from '../lib/auth'
import { SERVER_URL } from '../config'

interface Obra { id: string; nome: string; status: string }
interface FotoObra {
  id: string; imagemPath: string; descricao: string | null
  dataRegistro: string; user: { name: string }
}

interface Props { navigation: any; user: SessionUser; onLogout: () => void }

export default function FotoObraScreen({ navigation, user }: Props) {
  const [obras, setObras] = useState<Obra[]>([])
  const [selObra, setSelObra] = useState<Obra | null>(null)
  const [fotos, setFotos] = useState<FotoObra[]>([])
  const [loadingFotos, setLoadingFotos] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [pickObraModal, setPickObraModal] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    api.get<Obra[]>('/obras').then((data) =>
      setObras(data.filter((o: any) => o.status === 'em_andamento'))
    ).catch(() => {})
  }, [])

  const loadFotos = async (obra: Obra) => {
    setLoadingFotos(true)
    try {
      const data = await api.get<FotoObra[]>(`/obras/${obra.id}/fotos`)
      setFotos(data)
    } catch {
      setFotos([])
    } finally {
      setLoadingFotos(false)
    }
  }

  const selectObra = (obra: Obra) => {
    setSelObra(obra)
    setPickObraModal(false)
    loadFotos(obra)
  }

  const pickImage = async (fromCamera: boolean) => {
    if (!selObra) { Alert.alert('Atenção', 'Selecione uma obra primeiro'); return }

    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Conceda permissão nas configurações.')
      return
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.75 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.75 })

    if (!result.canceled && result.assets[0]?.base64) {
      uploadFoto(result.assets[0].base64)
    }
  }

  const uploadFoto = async (base64: string) => {
    setUploading(true)
    try {
      await api.post(`/obras/${selObra!.id}/fotos`, {
        imagemBase64: base64,
        dataRegistro: new Date().toISOString(),
        descricao: descricao || null,
      })
      setDescricao('')
      await loadFotos(selObra!)
      Alert.alert('✅ Foto enviada!', 'A foto foi arquivada na obra.')
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao enviar foto')
    } finally {
      setUploading(false)
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Fotos da Obra</Text>
          <Text style={s.headerSub}>{user.name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Selecionar Obra */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Obra</Text>
          <TouchableOpacity style={s.obraPicker} onPress={() => setPickObraModal(true)}>
            <Text style={[s.obraPickerText, !selObra && s.obraPickerPh]}>
              {selObra ? selObra.nome : 'Selecione a obra...'}
            </Text>
            <Text style={s.obraPickerChev}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Upload */}
        {selObra && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Adicionar Foto</Text>
            <TextInput
              style={s.descInput}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Descrição da foto (opcional)"
            />
            <View style={s.photoButtons}>
              <TouchableOpacity
                style={[s.photoBtn, uploading && s.photoBtnDisabled]}
                onPress={() => pickImage(true)} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" /> : <>
                  <Text style={s.photoBtnIcon}>📷</Text>
                  <Text style={s.photoBtnText}>Câmera</Text>
                </>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.photoBtn, s.photoBtnAlt, uploading && s.photoBtnDisabled]}
                onPress={() => pickImage(false)} disabled={uploading}>
                <Text style={s.photoBtnIcon}>🖼️</Text>
                <Text style={s.photoBtnText}>Galeria</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Galeria */}
        {selObra && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              Fotos Arquivadas {fotos.length > 0 ? `(${fotos.length})` : ''}
            </Text>
            {loadingFotos ? (
              <ActivityIndicator color="#8b5cf6" style={{ marginTop: 20 }} />
            ) : fotos.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>📸</Text>
                <Text style={s.emptyText}>Nenhuma foto ainda</Text>
              </View>
            ) : (
              <View style={s.grid}>
                {fotos.map((f) => (
                  <TouchableOpacity
                    key={f.id} style={s.thumb}
                    onPress={() => setLightbox(`${SERVER_URL}${f.imagemPath}`)}>
                    <Image
                      source={{ uri: `${SERVER_URL}${f.imagemPath}` }}
                      style={s.thumbImg} />
                    <View style={s.thumbOverlay}>
                      <Text style={s.thumbDate}>
                        {new Date(f.dataRegistro).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Picker Obra */}
      <Modal visible={pickObraModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Selecionar Obra</Text>
            <TouchableOpacity onPress={() => setPickObraModal(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {obras.map((o) => (
              <TouchableOpacity key={o.id} style={s.pickItem} onPress={() => selectObra(o)}>
                <Text style={s.pickTitle}>{o.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
  content: { padding: 16, gap: 16 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  obraPicker: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  obraPickerText: { fontSize: 15, color: '#1e293b' },
  obraPickerPh: { color: '#94a3b8' },
  obraPickerChev: { color: '#94a3b8', fontSize: 16 },
  descInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b',
    marginBottom: 12,
  },
  photoButtons: { flexDirection: 'row', gap: 12 },
  photoBtn: {
    flex: 1, backgroundColor: '#8b5cf6', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  photoBtnAlt: { backgroundColor: '#1e293b' },
  photoBtnDisabled: { opacity: 0.5 },
  photoBtnIcon: { fontSize: 24, marginBottom: 4 },
  photoBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: '30.5%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  thumbImg: { width: '100%', height: '100%' },
  thumbOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', padding: 4,
  },
  thumbDate: { color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  modalClose: { fontSize: 20, color: '#94a3b8' },
  pickItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  lightbox: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  lightboxCloseText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  lightboxImg: { width: '100%', height: '80%' },
})
