import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

function getWeekStartEnd(isoWeek: string): { start: Date; end: Date } {
  const [year, week] = isoWeek.split('-W').map(Number)
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1)
  const start = new Date(startOfWeek1)
  start.setDate(startOfWeek1.getDate() + (week - 1) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const semanaParam = searchParams.get('semana') || getISOWeek(new Date())
  const obraId = searchParams.get('obraId')

  const obrasQuery = await prisma.obra.findMany({
    where: {
      status: 'em_andamento',
      ...(obraId ? { id: obraId } : {}),
    },
    orderBy: { nome: 'asc' },
    include: {
      atividades: {
        where: { status: 'ativa' },
        orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
        include: {
          registros: {
            orderBy: { semana: 'desc' },
          },
        },
      },
    },
  })

  const { start, end } = getWeekStartEnd(semanaParam)

  const result = obrasQuery.map((obra) => {
    const atividades = obra.atividades.map((at) => {
      // Find current week record
      const registroAtual = at.registros.find((r) => r.semana === semanaParam)

      // Find previous cumulative (last non-current week record)
      const registroAnterior = at.registros.find((r) => r.semana < semanaParam)

      const percentualAcumuladoAnterior = registroAnterior
        ? registroAnterior.percentualExecutado
        : 0
      const percentualPlanejadoSemana = registroAtual?.percentualPlanejado ?? 0
      const percentualExecutadoSemana = registroAtual?.percentualExecutado ?? 0
      const percentualAcumuladoAtual = Math.min(100, percentualAcumuladoAnterior + percentualExecutadoSemana)

      return {
        id: at.id,
        nome: at.nome,
        descricao: at.descricao,
        peso: at.peso,
        unidade: at.unidade,
        registroAtualId: registroAtual?.id ?? null,
        percentualAcumuladoAnterior,
        percentualPlanejadoSemana,
        percentualExecutadoSemana,
        percentualAcumuladoAtual,
        observacao: registroAtual?.observacao ?? null,
      }
    })

    // Weighted average of cumulative execution
    const pesoTotal = atividades.reduce((s, a) => s + a.peso, 0)
    const evolucaoPonderada = pesoTotal > 0
      ? atividades.reduce((s, a) => s + a.peso * a.percentualAcumuladoAtual, 0) / pesoTotal
      : 0

    return {
      obra: { id: obra.id, nome: obra.nome, cliente: obra.cliente, cidade: obra.cidade },
      semana: semanaParam,
      periodoInicio: start.toISOString().slice(0, 10),
      periodoFim: end.toISOString().slice(0, 10),
      atividades,
      evolucaoPonderada: parseFloat(evolucaoPonderada.toFixed(1)),
    }
  })

  return NextResponse.json(result)
}
