import { useEffect, useRef, useState } from 'react'
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { getStoredUser, SessionUser } from './src/lib/auth'

import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import AdminScreen from './src/screens/AdminScreen'
import EngineerScreen from './src/screens/EngineerScreen'
import UserScreen from './src/screens/UserScreen'
import PontoScreen from './src/screens/PontoScreen'
import AlmoxarifadoScreen from './src/screens/AlmoxarifadoScreen'
import FotoObraScreen from './src/screens/FotoObraScreen'
import ObrasScreen from './src/screens/ObrasScreen'
import ConsolidadoScreen from './src/screens/ConsolidadoScreen'
import ControleAtividadesScreen from './src/screens/ControleAtividadesScreen'
import FuncionariosScreen from './src/screens/FuncionariosScreen'

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
    try {
      const N = require('expo-notifications')
      notificationListener.current = N.addNotificationReceivedListener((notification: any) => {
        console.log('Notification received:', notification)
      })
      responseListener.current = N.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data
        if (data?.type === 'ponto_impar' && navigationRef.current) {
          navigationRef.current.navigate('Ponto')
        }
      })
    } catch {
      // notificações não disponíveis neste ambiente
    }

    return () => {
      try {
        notificationListener.current?.remove()
        responseListener.current?.remove()
      } catch {}
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
        <Stack.Screen name="Obras">
          {(props) => <ObrasScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
        <Stack.Screen name="Consolidado">
          {(props) => <ConsolidadoScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
        <Stack.Screen name="ControleAtividades">
          {(props) => <ControleAtividadesScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
        <Stack.Screen name="Funcionarios">
          {(props) => <FuncionariosScreen {...props} user={user!} onLogout={() => setUser(null)} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  )
}
