import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, isAdmin, isEngenheiro } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const solicitacoes = await prisma.solicitacaoAdiantamento.findMany({
      where: status ? { status } : undefined,
      orderBy: { criadoEm: 'desc' },
      include: {
        funcionario: { select: { nome: true, cargo: true } },
        obra: { select: { nome: true } },
        criadoPor: { select: { name: true } },
        aprovadoPor: { select: { name: true } },
      },
    })

    return NextResponse.json(solicitacoes)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar solicitações' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Apenas administradores podem criar solicitações' }, { status: 403 })
    }

    const body = await req.json()

    const solicitacao = await prisma.solicitacaoAdiantamento.create({
      data: {
        funcionarioId: body.funcionarioId,
        obraId: body.obraId,
        valor: parseFloat(body.valor),
        motivo: body.motivo,
        criadoPorId: session.userId,
        status: 'pendente',
      },
      include: {
        funcionario: { select: { nome: true, cargo: true } },
        obra: { select: { nome: true } },
        criadoPor: { select: { name: true } },
      },
    })

    return NextResponse.json(solicitacao, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar solicitação' }, { status: 500 })
  }
}
