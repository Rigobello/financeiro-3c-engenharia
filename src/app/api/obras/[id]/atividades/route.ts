import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, isAdmin } from '@/lib/auth'

function isEngOrAdmin(grupos: string[]) {
  return grupos.includes('Administrador') || grupos.includes('Engenheiro')
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const atividades = await prisma.atividadeObra.findMany({
    where: { obraId: id, status: 'ativa' },
    orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
    include: {
      registros: {
        orderBy: { semana: 'desc' },
        take: 10,
        include: { registradoPor: { select: { name: true } } },
      },
    },
  })

  return NextResponse.json(atividades)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isEngOrAdmin(session.grupos)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id: obraId } = await params
  const body = await req.json()

  if (!body.nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (![1, 2, 3].includes(Number(body.peso))) {
    return NextResponse.json({ error: 'Peso deve ser 1, 2 ou 3' }, { status: 400 })
  }

  const last = await prisma.atividadeObra.findFirst({
    where: { obraId },
    orderBy: { ordem: 'desc' },
    select: { ordem: true },
  })

  const atividade = await prisma.atividadeObra.create({
    data: {
      obraId,
      nome: body.nome,
      descricao: body.descricao || null,
      peso: Number(body.peso),
      unidade: body.unidade || null,
      ordem: (last?.ordem ?? 0) + 1,
    },
  })

  return NextResponse.json(atividade, { status: 201 })
}
