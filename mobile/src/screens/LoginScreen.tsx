import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native'
import { loginWithToken, SessionUser } from '../lib/auth'
import { registerForPushNotifications, sendTokenToServer } from '../lib/notifications'

interface Props {
  navigation: any
  onLogin: (user: SessionUser) => void
}

export default function LoginScreen({ navigation, onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Atenção', 'Preencha usuário e senha.')
      return
    }

    setLoading(true)
    try {
      const { user } = await loginWithToken(username, password)
      onLogin(user)
      navigation.replace('Home')
      // Register for push notifications after successful login (non-blocking)
      registerForPushNotifications().then((token) => {
        if (token) sendTokenToServer(token)
      }).catch(() => {})
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/Logo3C.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>3C Engenharia</Text>
        <Text style={styles.subtitle}>Controle Financeiro</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Entrar</Text>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Usuário</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="login"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPwd}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showPwd ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>v2.0.0</Text>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 100, height: 100, marginBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  inputWrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 8 },
  eyeText: { fontSize: 20 },
  button: {
    backgroundColor: '#5165A8', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  version: { color: '#475569', fontSize: 12, marginTop: 24 },
})
