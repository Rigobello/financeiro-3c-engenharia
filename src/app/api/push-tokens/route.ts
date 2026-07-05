import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { token, platform } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })

  await prisma.pushToken.upsert({
    where: { token },
    create: { userId: session.userId, token, platform: platform ?? null },
    update: { userId: session.userId, platform: platform ?? null },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { token } = await req.json()
  await prisma.pushToken.deleteMany({ where: { token, userId: session.userId } })
  return NextResponse.json({ ok: true })
}
