import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const obra = await prisma.obra.findUnique({
      where: { id },
      include: {
        lancamentos: { orderBy: { data: 'desc' } },
        pagamentos: {
          orderBy: { data: 'desc' },
          include: { funcionario: { select: { nome: true, cargo: true } } },
        },
        funcionariosObra: {
          include: { funcionario: { select: { id: true, nome: true, cargo: true, salarioBase: true } } },
        },
      },
    })

    if (!obra) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 })
    }

    const entradas = obra.lancamentos
      .filter((l) => l.tipo === 'entrada')
      .reduce((s, l) => s + l.valor, 0)
    const saidas = obra.lancamentos
      .filter((l) => l.tipo === 'saida')
      .reduce((s, l) => s + l.valor, 0)
    const totalPagamentos = obra.pagamentos.reduce((s, p) => s + p.valor, 0)

    return NextResponse.json({
      ...obra,
      saldo: entradas - saidas - totalPagamentos,
      totalEntradas: entradas,
      totalSaidas: saidas + totalPagamentos,
      totalPagamentos,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar obra' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const obra = await prisma.obra.update({
      where: { id },
      data: {
        nome: body.nome,
        cliente: body.cliente,
        endereco: body.endereco || null,
        cidade: body.cidade || null,
        dataInicio: new Date(body.dataInicio),
        dataFim: body.dataFim ? new Date(body.dataFim) : null,
        status: body.status,
        orcamento: parseFloat(body.orcamento),
        descricao: body.descricao || null,
      },
    })
    return NextResponse.json(obra)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar obra' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.obra.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao excluir obra' }, { status: 500 })
  }
}
