import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { api } from './api'

// Expo Go não suporta push remoto desde SDK 53
const isExpoGo = Constants.appOwnership === 'expo'

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ponto', {
      name: 'Alertas de Ponto',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    })
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data
  return token
}

export async function sendTokenToServer(token: string): Promise<void> {
  try {
    await api.post('/push-tokens', { token, platform: Platform.OS })
  } catch {
    // non-fatal
  }
}
