import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

function isEngOrAdmin(grupos: string[]) {
  return grupos.includes('Administrador') || grupos.includes('Engenheiro')
}

export async function GET() {
  const session = await getSession()
  if (!session || !isEngOrAdmin(session.grupos)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const [
    pagamentosFeitos,
    pagamentosAguardando,
    pontosEmAberto,
    solicitacoesPendentes,
    obrasAtivas,
    funcionariosAtivos,
    materiais,
  ] = await Promise.all([
    // Pagamentos com status pago
    prisma.registroPonto.aggregate({
      where: { status: 'pago' },
      _count: true,
    }),
    // Pagamentos aguardando
    prisma.registroPonto.aggregate({
      where: { status: 'aguarda_pagamento' },
      _count: true,
    }),
    // Pontos em aberto
    prisma.registroPonto.aggregate({
      where: { status: 'em_aberto' },
      _count: true,
    }),
    // Solicitações pendentes
    prisma.solicitacaoAdiantamento.findMany({
      where: { status: 'pendente' },
      include: {
        funcionario: { select: { nome: true } },
        obra: { select: { nome: true } },
      },
    }),
    // Obras em andamento
    prisma.obra.findMany({
      where: { status: 'em_andamento' },
      select: {
        id: true, nome: true, cliente: true, orcamento: true,
        _count: { select: { funcionariosObra: true, lancamentos: true } },
        lancamentos: { select: { valor: true, tipo: true } },
      },
    }),
    // Funcionários ativos
    prisma.funcionario.count({ where: { status: 'ativo' } }),
    // Materiais com estoque
    prisma.material.findMany({
      where: { status: 'ativo' },
      include: {
        movimentacoes: {
          include: {
            obraOrigem: { select: { id: true, nome: true } },
            obraDestino: { select: { id: true, nome: true } },
          },
          orderBy: { data: 'desc' },
        },
      },
    }),
  ])

  // Total pagamentos (real Pagamento table)
  const [totalPagamentosValor, totalAdiantamentosValor] = await Promise.all([
    prisma.pagamento.aggregate({ _sum: { valor: true } }),
    prisma.solicitacaoAdiantamento.aggregate({
      where: { status: 'aprovado' },
      _sum: { valorAutorizado: true },
    }),
  ])

  // Compute stock per location for each material
  const materiaisComLocais = materiais.map((m) => {
    const stock: Record<string, number> = { deposito: m.quantidadeTotal }
    for (const mov of m.movimentacoes) {
      const ok = mov.obraOrigemId ?? 'deposito'
      const dk = mov.obraDestinoId ?? 'deposito'
      stock[ok] = (stock[ok] ?? 0) - mov.quantidade
      stock[dk] = (stock[dk] ?? 0) + mov.quantidade
    }
    const locais: { nome: string; quantidade: number }[] = []
    if ((stock.deposito ?? 0) > 0) locais.push({ nome: 'Depósito', quantidade: stock.deposito })
    for (const mov of m.movimentacoes) {
      if (mov.obraDestinoId && mov.obraDestino) {
        const qty = stock[mov.obraDestinoId] ?? 0
        if (qty > 0 && !locais.find((l) => l.nome === mov.obraDestino!.nome)) {
          locais.push({ nome: mov.obraDestino.nome, quantidade: qty })
        }
      }
    }
    return { id: m.id, nome: m.nome, unidade: m.unidade, locais }
  })

  // Compute financials per obra
  const obrasComFinanceiro = obrasAtivas.map((o) => {
    const custos = o.lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
    const receitas = o.lancamentos.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
    return {
      id: o.id,
      nome: o.nome,
      cliente: o.cliente,
      orcamento: o.orcamento,
      custos,
      receitas,
      saldo: receitas - custos,
      funcionarios: o._count.funcionariosObra,
    }
  })

  return NextResponse.json({
    geradoEm: new Date().toISOString(),
    resumo: {
      funcionariosAtivos,
      obrasAtivas: obrasAtivas.length,
      totalPagamentos: totalPagamentosValor._sum.valor ?? 0,
      totalAdiantamentos: totalAdiantamentosValor._sum.valorAutorizado ?? 0,
      pontosPagos: pagamentosFeitos._count,
      pontosAguardandoPagamento: pagamentosAguardando._count,
      pontosEmAberto: pontosEmAberto._count,
      solicitacoesPendentes: solicitacoesPendentes.length,
    },
    obras: obrasComFinanceiro,
    materiais: materiaisComLocais,
    solicitacoesPendentes: solicitacoesPendentes.map((s) => ({
      id: s.id,
      funcionario: s.funcionario.nome,
      obra: s.obra.nome,
      valor: s.valor,
      motivo: s.motivo,
      criadoEm: s.criadoEm,
    })),
  })
}
