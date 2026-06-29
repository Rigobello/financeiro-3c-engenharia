import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || '3c-engenharia-secret-2024-financeiro'
)
const COOKIE_NAME = '3c-token'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/token', '/api/auth/web-login']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rotas públicas
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Verificar token em cookie ou Authorization header
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value
  const bearerToken = req.headers.get('authorization')?.replace('Bearer ', '')
  const token = cookieToken || bearerToken

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete(COOKIE_NAME)
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
}
