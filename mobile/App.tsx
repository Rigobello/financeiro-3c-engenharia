import { useEffect, useRef, useState } from 'react'
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { getStoredUser, SessionUser } from './src/lib/auth'
import * as Notifications from 'expo-notifications'

import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import AdminScreen from './src/screens/AdminScreen'
import EngineerScreen from './src/screens/EngineerScreen'
import UserScreen from './src/screens/UserScreen'
import PontoScreen from './src/screens/PontoScreen'
import AlmoxarifadoScreen from './src/screens/AlmoxarifadoScreen'
import FotoObraScreen from './src/screens/FotoObraScreen'

const Stack = createNativeStackNavigator()

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigationRef = useRef<NavigationContainerRef<any>>(null)
  const notificationListener = useRef<any>(null)
  const responseListener = useRef<any>(null)

  useEffect(() => {
    getStoredUser().then((u) => { setUser(u); setLoading(false) })
  }, [])

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification)
    })
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any
      if (data?.type === 'ponto_impar' && navigationRef.current) {
        navigationRef.current.navigate('Ponto')
      }
    })
    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  if (loading) return null

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <Stack.Navigator initialRouteName={user ? 'Home' : 'Login'} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {(props) => <LoginScreen {...props} onLogin={(u) => setUser(u)} />}
        </Stack.Screen>
        <Stack.Screen name="Home">
          {(props) => <HomeScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
        <Stack.Screen name="Admin">
          {(props) => <AdminScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
        <Stack.Screen name="Engineer">
          {(props) => <EngineerScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
        <Stack.Screen name="User">
          {(props) => <UserScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
        <Stack.Screen name="Ponto">
          {(props) => <PontoScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
        <Stack.Screen name="Almoxarifado">
          {(props) => <AlmoxarifadoScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
        <Stack.Screen name="FotoObra">
          {(props) => <FotoObraScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  )
}
