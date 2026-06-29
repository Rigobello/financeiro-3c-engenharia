import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, isAdmin, isEngenheiro } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { id } = await params
    const solicitacao = await prisma.solicitacaoAdiantamento.findUnique({
      where: { id },
      include: {
        funcionario: { select: { nome: true, cargo: true, salarioBase: true } },
        obra: { select: { nome: true, cliente: true } },
        criadoPor: { select: { name: true } },
        aprovadoPor: { select: { name: true } },
      },
    })

    if (!solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    return NextResponse.json(solicitacao)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar solicitação' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Apenas engenheiros ou admins podem responder
    if (!isEngenheiro(session) && !isAdmin(session)) {
      return NextResponse.json({ error: 'Sem permissão para responder' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const { acao, valorAutorizado, motivoResposta } = body
    // acao: 'autorizar' | 'autorizar_outro_valor' | 'negar'

    const statusMap: Record<string, string> = {
      autorizar: 'autorizado',
      autorizar_outro_valor: 'autorizado_outro_valor',
      negar: 'negado',
    }

    const novoStatus = statusMap[acao]
    if (!novoStatus) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    const solicitacao = await prisma.solicitacaoAdiantamento.update({
      where: { id },
      data: {
        status: novoStatus,
        valorAutorizado: acao === 'autorizar_outro_valor' ? parseFloat(valorAutorizado) : undefined,
        motivoResposta: motivoResposta || null,
        aprovadoPorId: session.userId,
        respondidoEm: new Date(),
      },
      include: {
        funcionario: { select: { nome: true } },
        obra: { select: { nome: true } },
      },
    })

    // Se autorizado, criar pagamento automaticamente
    if (acao === 'autorizar' || acao === 'autorizar_outro_valor') {
      const valorFinal = acao === 'autorizar_outro_valor' ? parseFloat(valorAutorizado) : solicitacao.valor
      await prisma.pagamento.create({
        data: {
          funcionarioId: solicitacao.funcionarioId,
          obraId: solicitacao.obraId,
          valor: valorFinal,
          tipo: 'adiantamento',
          data: new Date(),
          descricao: `Adiantamento autorizado - ${solicitacao.motivoResposta || 'Workflow aprovado'}`,
        },
      })
    }

    return NextResponse.json(solicitacao)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao responder solicitação' }, { status: 500 })
  }
}
