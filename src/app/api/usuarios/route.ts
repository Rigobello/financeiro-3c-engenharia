import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, isAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const usuarios = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: { grupos: { include: { grupo: true } } },
    })

    return NextResponse.json(
      usuarios.map(({ passwordHash: _pw, ...u }) => ({
        ...u,
        grupos: u.grupos.map((ug) => ug.grupo),
      }))
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const passwordHash = await bcrypt.hash(body.password, 12)

    const user = await prisma.user.create({
      data: {
        username: body.username,
        name: body.name,
        passwordHash,
        status: body.status || 'ativo',
      },
    })

    if (body.grupoIds && body.grupoIds.length > 0) {
      await prisma.userGrupo.createMany({
        data: body.grupoIds.map((grupoId: string) => ({ userId: user.id, grupoId })),
      })
    }

    return NextResponse.json({ id: user.id, username: user.username, name: user.name }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
