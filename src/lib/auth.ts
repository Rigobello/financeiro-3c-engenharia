import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || '3c-engenharia-secret-2024-financeiro'
)

export const COOKIE_NAME = '3c-token'

export interface SessionUser {
  userId: string
  username: string
  name: string
  grupos: string[]
}

export async function signToken(payload: SessionUser): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function isAdmin(user: SessionUser): boolean {
  return user.grupos.includes('Administrador')
}

export function isEngenheiro(user: SessionUser): boolean {
  return user.grupos.includes('Engenheiro')
}

export function isUsuario(user: SessionUser): boolean {
  return user.grupos.includes('Usuário')
}
