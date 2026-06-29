import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const obraId = searchParams.get('obraId')
    const tipo = searchParams.get('tipo')

    const lancamentos = await prisma.lancamento.findMany({
      where: {
        ...(obraId ? { obraId } : {}),
        ...(tipo ? { tipo } : {}),
      },
      orderBy: { data: 'desc' },
      include: { obra: { select: { nome: true } } },
    })

    return NextResponse.json(lancamentos)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar lançamentos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const lancamento = await prisma.lancamento.create({
      data: {
        obraId: body.obraId,
        tipo: body.tipo,
        valor: parseFloat(body.valor),
        descricao: body.descricao,
        categoria: body.categoria,
        data: new Date(body.data),
      },
      include: { obra: { select: { nome: true } } },
    })
    return NextResponse.json(lancamento, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar lançamento' }, { status: 500 })
  }
}
