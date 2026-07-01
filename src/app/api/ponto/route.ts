import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

function isPonto(grupos: string[]) {
  return grupos.includes('Ponto') || grupos.includes('Administrador')
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const funcionarioId = searchParams.get('funcionarioId')
  const obraId = searchParams.get('obraId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const pontos = await prisma.registroPonto.findMany({
    where: {
      ...(funcionarioId ? { funcionarioId } : {}),
      ...(obraId ? { obraId } : {}),
      ...(startDate || endDate
        ? {
            dataHora: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate + 'T23:59:59') } : {}),
            },
          }
        : {}),
    },
    include: {
      funcionario: { select: { id: true, nome: true, cargo: true } },
      obra: { select: { id: true, nome: true } },
      registradoPor: { select: { id: true, name: true } },
    },
    orderBy: { dataHora: 'desc' },
  })

  return NextResponse.json(pontos)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !isPonto(session.grupos)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json()

  if (!body.funcionarioId || !body.tipo || !body.dataHora) {
    return NextResponse.json({ error: 'Campos obrigatórios: funcionarioId, tipo, dataHora' }, { status: 400 })
  }

  const ponto = await prisma.registroPonto.create({
    data: {
      funcionarioId: body.funcionarioId,
      obraId: body.obraId || null,
      tipo: body.tipo,
      dataHora: new Date(body.dataHora),
      registradoPorId: session.userId,
      observacao: body.observacao || null,
    },
    include: {
      funcionario: { select: { nome: true, cargo: true } },
      obra: { select: { nome: true } },
    },
  })

  return NextResponse.json(ponto, { status: 201 })
}
