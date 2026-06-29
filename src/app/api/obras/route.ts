import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const obras = await prisma.obra.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { lancamentos: true, pagamentos: true, funcionariosObra: true },
        },
        lancamentos: { select: { tipo: true, valor: true } },
        pagamentos: { select: { valor: true } },
      },
    })

    const obrasComSaldo = obras.map((obra) => {
      const entradas = obra.lancamentos
        .filter((l) => l.tipo === 'entrada')
        .reduce((s, l) => s + l.valor, 0)
      const saidas = obra.lancamentos
        .filter((l) => l.tipo === 'saida')
        .reduce((s, l) => s + l.valor, 0)
      const totalPagamentos = obra.pagamentos.reduce((s, p) => s + p.valor, 0)

      return {
        ...obra,
        saldo: entradas - saidas - totalPagamentos,
        totalEntradas: entradas,
        totalSaidas: saidas + totalPagamentos,
        totalPagamentos,
      }
    })

    return NextResponse.json(obrasComSaldo)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar obras' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const obra = await prisma.obra.create({
      data: {
        nome: body.nome,
        cliente: body.cliente,
        endereco: body.endereco || null,
        cidade: body.cidade || null,
        dataInicio: new Date(body.dataInicio),
        dataFim: body.dataFim ? new Date(body.dataFim) : null,
        status: body.status || 'em_andamento',
        orcamento: parseFloat(body.orcamento),
        descricao: body.descricao || null,
      },
    })
    return NextResponse.json(obra, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar obra' }, { status: 500 })
  }
}
