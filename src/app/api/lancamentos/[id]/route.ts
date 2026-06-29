import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.lancamento.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao excluir lançamento' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const lancamento = await prisma.lancamento.update({
      where: { id },
      data: {
        tipo: body.tipo,
        valor: parseFloat(body.valor),
        descricao: body.descricao,
        categoria: body.categoria,
        data: new Date(body.data),
      },
    })
    return NextResponse.json(lancamento)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar lançamento' }, { status: 500 })
  }
}
