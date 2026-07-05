import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '../config'

export interface SessionUser {
  userId: string
  username: string
  name: string
  grupos: string[]
}

export async function login(username: string, password: string): Promise<SessionUser> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Erro ao fazer login')
  }

  // Buscar token do me endpoint com cookie
  // Para mobile, usamos Authorization header — precisamos do token
  // Vamos buscar via endpoint me
  const meRes = await fetch(`${API_URL}/auth/me`, {
    headers: { 'Cookie': res.headers.get('set-cookie') || '' },
  })

  // Como não temos cookies no mobile, vamos usar o endpoint de token
  // O servidor retorna o user diretamente
  const user: SessionUser = data.user
  await AsyncStorage.setItem('user', JSON.stringify(user))

  return user
}

export async function loginWithToken(username: string, password: string): Promise<{ user: SessionUser; token: string }> {
  const res = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Usuário ou senha inválidos')
  }

  await AsyncStorage.setItem('token', data.token)
  await AsyncStorage.setItem('user', JSON.stringify(data.user))

  return data
}

export async function getStoredUser(): Promise<SessionUser | null> {
  const str = await AsyncStorage.getItem('user')
  if (!str) return null
  return JSON.parse(str)
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove(['token', 'user'])
}

export function isAdmin(user: SessionUser): boolean {
  return user.grupos.includes('Administrador')
}

export function isEngenheiro(user: SessionUser): boolean {
  return user.grupos.includes('Engenheiro')
}
