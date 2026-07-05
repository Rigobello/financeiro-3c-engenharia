import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

function isEngOrAdmin(grupos: string[]) {
  return grupos.includes('Administrador') || grupos.includes('Engenheiro')
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; atividadeId: string }> }) {
  const session = await getSession()
  if (!session || !isEngOrAdmin(session.grupos)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { atividadeId } = await params
  const body = await req.json()

  const atividade = await prisma.atividadeObra.update({
    where: { id: atividadeId },
    data: {
      nome: body.nome,
      descricao: body.descricao ?? null,
      peso: Number(body.peso),
      unidade: body.unidade ?? null,
      ordem: body.ordem !== undefined ? Number(body.ordem) : undefined,
    },
  })

  return NextResponse.json(atividade)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; atividadeId: string }> }) {
  const session = await getSession()
  if (!session || !isEngOrAdmin(session.grupos)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { atividadeId } = await params
  await prisma.atividadeObra.update({
    where: { id: atividadeId },
    data: { status: 'inativa' },
  })

  return NextResponse.json({ ok: true })
}
