import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, isAdmin } from '@/lib/auth'

function isAlmox(grupos: string[]) {
  return grupos.includes('Almoxarifado') || isAdmin({ grupos } as any)
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const materialId = searchParams.get('materialId')
  const obraId = searchParams.get('obraId')

  const movs = await prisma.movimentacaoMaterial.findMany({
    where: {
      ...(materialId ? { materialId } : {}),
      ...(obraId
        ? { OR: [{ obraOrigemId: obraId }, { obraDestinoId: obraId }] }
        : {}),
    },
    include: {
      material: { select: { id: true, nome: true, unidade: true } },
      obraOrigem: { select: { id: true, nome: true } },
      obraDestino: { select: { id: true, nome: true } },
      registradoPor: { select: { name: true } },
    },
    orderBy: { data: 'desc' },
    take: 200,
  })

  return NextResponse.json(movs)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !isAlmox(session.grupos)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json()

  if (!body.materialId || !body.data || body.quantidade == null) {
    return NextResponse.json({ error: 'materialId, data e quantidade são obrigatórios' }, { status: 400 })
  }

  // Validar que origem e destino não são iguais
  const origemKey = body.obraOrigemId ?? 'deposito'
  const destinoKey = body.obraDestinoId ?? 'deposito'
  if (origemKey === destinoKey) {
    return NextResponse.json({ error: 'Origem e destino não podem ser iguais' }, { status: 400 })
  }

  const mov = await prisma.movimentacaoMaterial.create({
    data: {
      materialId: body.materialId,
      obraOrigemId: body.obraOrigemId || null,
      obraDestinoId: body.obraDestinoId || null,
      quantidade: Number(body.quantidade),
      data: new Date(body.data),
      observacao: body.observacao || null,
      responsavelNome: body.responsavelNome || null,
      registradoPorId: session.userId,
    },
    include: {
      material: { select: { nome: true, unidade: true } },
      obraOrigem: { select: { nome: true } },
      obraDestino: { select: { nome: true } },
    },
  })

  return NextResponse.json(mov, { status: 201 })
}
