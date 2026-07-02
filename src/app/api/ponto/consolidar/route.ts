import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const funcionarioId = searchParams.get('funcionarioId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!funcionarioId || !startDate || !endDate) {
    return NextResponse.json({ error: 'funcionarioId, startDate e endDate são obrigatórios' }, { status: 400 })
  }

  const funcionario = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    select: { id: true, nome: true, cargo: true, valorHora: true },
  })
  if (!funcionario) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

  const registros = await prisma.registroPonto.findMany({
    where: {
      funcionarioId,
      dataHora: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59'),
      },
    },
    orderBy: { dataHora: 'asc' },
    include: { obra: { select: { nome: true } } },
  })

  // Pair entrada/saída
  const pares: {
    entrada: (typeof registros)[0]
    saida: (typeof registros)[0] | null
    minutos: number
  }[] = []

  let entradaAberta: (typeof registros)[0] | null = null

  for (const r of registros) {
    if (r.tipo === 'entrada') {
      if (entradaAberta) {
        // entrada sem saída anterior → registrar sem par
        pares.push({ entrada: entradaAberta, saida: null, minutos: 0 })
      }
      entradaAberta = r
    } else if (r.tipo === 'saida') {
      if (entradaAberta) {
        const minutos = Math.round(
          (new Date(r.dataHora).getTime() - new Date(entradaAberta.dataHora).getTime()) / 60000
        )
        pares.push({ entrada: entradaAberta, saida: r, minutos })
        entradaAberta = null
      } else {
        // saída sem entrada → registrar como par incompleto
        pares.push({ entrada: r as any, saida: r, minutos: 0 })
      }
    }
  }

  if (entradaAberta) {
    pares.push({ entrada: entradaAberta, saida: null, minutos: 0 })
  }

  const totalMinutos = pares.reduce((s, p) => s + p.minutos, 0)
  const totalHoras = totalMinutos / 60
  const totalAPagar = funcionario.valorHora ? totalHoras * funcionario.valorHora : null

  return NextResponse.json({
    funcionario,
    periodo: { startDate, endDate },
    pares: pares.map((p) => ({
      entradaId: p.entrada.id,
      saidaId: p.saida?.id ?? null,
      data: p.entrada.dataHora.toISOString().slice(0, 10),
      entrada: p.entrada.dataHora,
      saida: p.saida?.dataHora ?? null,
      minutos: p.minutos,
      horas: parseFloat((p.minutos / 60).toFixed(2)),
      obra: p.entrada.obra?.nome ?? null,
    })),
    totalMinutos,
    totalHoras: parseFloat(totalHoras.toFixed(2)),
    valorHora: funcionario.valorHora,
    totalAPagar: totalAPagar !== null ? parseFloat(totalAPagar.toFixed(2)) : null,
  })
}
