import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// Endpoint específico para mobile — retorna o JWT no body (não em cookie)
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    const user = await prisma.user.findUnique({
      where: { username },
      include: { grupos: { include: { grupo: true } } },
    })

    if (!user || user.status !== 'ativo') {
      return NextResponse.json({ error: 'Usuário ou senha inválidos' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Usuário ou senha inválidos' }, { status: 401 })
    }

    const grupos = user.grupos.map((ug) => ug.grupo.nome)
    const sessionUser = { userId: user.id, username: user.username, name: user.name, grupos }
    const token = await signToken(sessionUser)

    return NextResponse.json({ token, user: sessionUser })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
