import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, COOKIE_NAME } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        grupos: { include: { grupo: true } },
      },
    })

    if (!user || user.status !== 'ativo') {
      return NextResponse.json({ error: 'Usuário ou senha inválidos' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Usuário ou senha inválidos' }, { status: 401 })
    }

    const grupos = user.grupos.map((ug) => ug.grupo.nome)

    const token = await signToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      grupos,
    })

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, name: user.name, grupos },
    })

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return res
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
