import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { atividadeObraId, semana, percentualPlanejado, percentualExecutado, observacao } = body

  if (!atividadeObraId || !semana) {
    return NextResponse.json({ error: 'atividadeObraId e semana são obrigatórios' }, { status: 400 })
  }

  const registro = await prisma.registroAtividade.upsert({
    where: { atividadeObraId_semana: { atividadeObraId, semana } },
    create: {
      atividadeObraId,
      semana,
      percentualPlanejado: Number(percentualPlanejado) || 0,
      percentualExecutado: Number(percentualExecutado) || 0,
      observacao: observacao || null,
      registradoPorId: session.userId,
    },
    update: {
      percentualPlanejado: Number(percentualPlanejado) || 0,
      percentualExecutado: Number(percentualExecutado) || 0,
      observacao: observacao || null,
      registradoPorId: session.userId,
    },
  })

  return NextResponse.json(registro)
}
