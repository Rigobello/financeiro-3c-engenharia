import { Platform } from 'react-native'
import { api } from './api'

// Inicializa o handler de forma segura (falha silenciosa se não disponível)
try {
  const N = require('expo-notifications')
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
} catch {
  // expo-notifications não disponível neste ambiente
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const Device = require('expo-device')
    if (!Device.isDevice) return null

    const N = require('expo-notifications')

    const { status: existingStatus } = await N.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await N.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return null

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('ponto', {
        name: 'Alertas de Ponto',
        importance: N.AndroidImportance.HIGH,
        sound: 'default',
      })
    }

    const token = (await N.getExpoPushTokenAsync()).data
    return token
  } catch {
    return null
  }
}

export async function sendTokenToServer(token: string): Promise<void> {
  try {
    await api.post('/push-tokens', { token, platform: Platform.OS })
  } catch {
    // non-fatal
  }
}
