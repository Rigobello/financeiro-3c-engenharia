import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

function isPonto(grupos: string[]) {
  return grupos.includes('Ponto') || grupos.includes('Administrador')
}

async function sendPushNotifications(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  if (tokens.length === 0) return
  const messages = tokens.map((to) => ({ to, sound: 'default', title, body, data: data ?? {} }))
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(messages),
    })
  } catch {
    // non-fatal
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const funcionarioId = searchParams.get('funcionarioId')
  const obraId = searchParams.get('obraId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const pontos = await prisma.registroPonto.findMany({
    where: {
      ...(funcionarioId ? { funcionarioId } : {}),
      ...(obraId ? { obraId } : {}),
      ...(startDate || endDate
        ? {
            dataHora: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate + 'T23:59:59') } : {}),
            },
          }
        : {}),
    },
    include: {
      funcionario: { select: { id: true, nome: true, cargo: true } },
      obra: { select: { id: true, nome: true } },
      registradoPor: { select: { id: true, name: true } },
    },
    orderBy: { dataHora: 'desc' },
  })

  return NextResponse.json(pontos)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !isPonto(session.grupos)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.funcionarioId || !body.tipo || !body.dataHora) {
    return NextResponse.json({ error: 'Campos obrigatórios: funcionarioId, tipo, dataHora' }, { status: 400 })
  }

  const dataHora = new Date(body.dataHora)
  const dayStart = new Date(dataHora)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dataHora)
  dayEnd.setHours(23, 59, 59, 999)

  // Create the ponto record
  const ponto = await prisma.registroPonto.create({
    data: {
      funcionarioId: body.funcionarioId,
      obraId: body.obraId || null,
      tipo: body.tipo,
      dataHora,
      registradoPorId: session.userId,
      observacao: body.observacao || null,
    },
    include: {
      funcionario: { select: { nome: true, cargo: true } },
      obra: { select: { nome: true } },
    },
  })

  // Check if total records for this employee today is odd
  const countToday = await prisma.registroPonto.count({
    where: {
      funcionarioId: body.funcionarioId,
      dataHora: { gte: dayStart, lte: dayEnd },
    },
  })

  const isImpar = countToday % 2 !== 0

  if (isImpar) {
    // Mark this record as alertaImpar
    await prisma.registroPonto.update({
      where: { id: ponto.id },
      data: { alertaImpar: true },
    })

    // Get push tokens of PONTO + ENGENHEIRO group users
    const usersToNotify = await prisma.user.findMany({
      where: {
        grupos: {
          some: { grupo: { nome: { in: ['Ponto', 'Engenheiro'] } } },
        },
        pushTokens: { some: {} },
      },
      include: { pushTokens: { select: { token: true } } },
    })

    const tokens = usersToNotify.flatMap((u) => u.pushTokens.map((t) => t.token))
    const nomeFuncionario = (ponto.funcionario as any)?.nome ?? 'Funcionário'

    await sendPushNotifications(
      tokens,
      '⚠️ Registro de Ponto Ímpar',
      `${nomeFuncionario} tem ${countToday} registro(s) hoje — verifique entrada/saída.`,
      { type: 'ponto_impar', funcionarioId: body.funcionarioId }
    )
  } else {
    // If now even, clear any previous alertaImpar for today
    await prisma.registroPonto.updateMany({
      where: {
        funcionarioId: body.funcionarioId,
        dataHora: { gte: dayStart, lte: dayEnd },
        alertaImpar: true,
      },
      data: { alertaImpar: false },
    })
  }

  return NextResponse.json({ ...ponto, alertaImpar: isImpar }, { status: 201 })
}
