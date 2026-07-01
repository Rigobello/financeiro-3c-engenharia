import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, isAdmin } from '@/lib/auth'

function isAlmox(grupos: string[]) {
  return grupos.includes('Almoxarifado') || isAdmin({ grupos } as any)
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const materiais = await prisma.material.findMany({
    where: { status: 'ativo' },
    orderBy: { nome: 'asc' },
    include: {
      movimentacoes: {
        include: {
          obraOrigem: { select: { id: true, nome: true } },
          obraDestino: { select: { id: true, nome: true } },
        },
        orderBy: { data: 'desc' },
      },
    },
  })

  // Calcular estoque atual por local
  const result = materiais.map((m) => {
    const stock: Record<string, number> = { deposito: m.quantidadeTotal }

    for (const mov of m.movimentacoes) {
      const origemKey = mov.obraOrigemId ?? 'deposito'
      const destinoKey = mov.obraDestinoId ?? 'deposito'
      stock[origemKey] = (stock[origemKey] ?? 0) - mov.quantidade
      stock[destinoKey] = (stock[destinoKey] ?? 0) + mov.quantidade
    }

    // Montar locais com quantidade > 0
    const locais: { local: string; nome: string; quantidade: number }[] = []
    if ((stock.deposito ?? 0) > 0) {
      locais.push({ local: 'deposito', nome: 'Depósito', quantidade: stock.deposito })
    }
    for (const mov of m.movimentacoes) {
      if (mov.obraDestinoId && mov.obraDestino) {
        const qty = stock[mov.obraDestinoId] ?? 0
        if (qty > 0 && !locais.find((l) => l.local === mov.obraDestinoId)) {
          locais.push({ local: mov.obraDestinoId, nome: mov.obraDestino.nome, quantidade: qty })
        }
      }
    }

    return { ...m, locais, movimentacoes: m.movimentacoes.slice(0, 10) }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !isAlmox(session.grupos)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const material = await prisma.material.create({
    data: {
      nome: body.nome,
      descricao: body.descricao || null,
      codigo: body.codigo || null,
      categoria: body.categoria || null,
      unidade: body.unidade || 'un',
      quantidadeTotal: Number(body.quantidadeTotal) || 1,
      status: 'ativo',
    },
  })

  return NextResponse.json(material, { status: 201 })
}
