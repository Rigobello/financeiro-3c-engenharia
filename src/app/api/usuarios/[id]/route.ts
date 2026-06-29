import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, isAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {
      username: body.username,
      name: body.name,
      status: body.status,
    }

    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 12)
    }

    await prisma.user.update({ where: { id }, data: updateData })

    // Atualizar grupos
    if (body.grupoIds !== undefined) {
      await prisma.userGrupo.deleteMany({ where: { userId: id } })
      if (body.grupoIds.length > 0) {
        await prisma.userGrupo.createMany({
          data: body.grupoIds.map((grupoId: string) => ({ userId: id, grupoId })),
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params

    if (id === session.userId) {
      return NextResponse.json({ error: 'Não é possível excluir o próprio usuário' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao excluir usuário' }, { status: 500 })
  }
}
