import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const obraId = searchParams.get('obraId')
    const funcionarioId = searchParams.get('funcionarioId')

    const pagamentos = await prisma.pagamento.findMany({
      where: {
        ...(obraId ? { obraId } : {}),
        ...(funcionarioId ? { funcionarioId } : {}),
      },
      orderBy: { data: 'desc' },
      include: {
        funcionario: { select: { nome: true, cargo: true } },
        obra: { select: { nome: true } },
      },
    })

    return NextResponse.json(pagamentos)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar pagamentos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const pagamento = await prisma.pagamento.create({
      data: {
        funcionarioId: body.funcionarioId,
        obraId: body.obraId,
        valor: parseFloat(body.valor),
        tipo: body.tipo,
        data: new Date(body.data),
        descricao: body.descricao || null,
      },
      include: {
        funcionario: { select: { nome: true, cargo: true } },
        obra: { select: { nome: true } },
      },
    })
    return NextResponse.json(pagamento, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}
