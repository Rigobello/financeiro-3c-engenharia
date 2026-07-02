import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params

  const movimentacoes = await prisma.movimentacaoMaterial.findMany({
    where: { materialId: id },
    include: {
      obraOrigem: { select: { id: true, nome: true } },
      obraDestino: { select: { id: true, nome: true } },
      registradoPor: { select: { id: true, name: true } },
    },
    orderBy: { data: 'desc' },
  })

  return NextResponse.json(movimentacoes)
}
