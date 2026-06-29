import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [obras, lancamentos, pagamentos, funcionarios] = await Promise.all([
      prisma.obra.findMany({
        include: {
          lancamentos: { select: { tipo: true, valor: true, data: true } },
          pagamentos: { select: { valor: true, data: true } },
        },
      }),
      prisma.lancamento.findMany({ orderBy: { data: 'desc' }, take: 10, include: { obra: { select: { nome: true } } } }),
      prisma.pagamento.findMany({
        orderBy: { data: 'desc' },
        take: 10,
        include: {
          funcionario: { select: { nome: true } },
          obra: { select: { nome: true } },
        },
      }),
      prisma.funcionario.count({ where: { status: 'ativo' } }),
    ])

    const obrasEmAndamento = obras.filter((o) => o.status === 'em_andamento').length
    const obrasConcluidas = obras.filter((o) => o.status === 'concluida').length

    let totalEntradas = 0
    let totalSaidas = 0
    let totalPagamentos = 0

    obras.forEach((obra) => {
      obra.lancamentos.forEach((l) => {
        if (l.tipo === 'entrada') totalEntradas += l.valor
        else totalSaidas += l.valor
      })
      obra.pagamentos.forEach((p) => {
        totalPagamentos += p.valor
      })
    })

    const resumoObras = obras.map((obra) => {
      const entradas = obra.lancamentos
        .filter((l) => l.tipo === 'entrada')
        .reduce((s, l) => s + l.valor, 0)
      const saidas = obra.lancamentos
        .filter((l) => l.tipo === 'saida')
        .reduce((s, l) => s + l.valor, 0)
      const pagtos = obra.pagamentos.reduce((s, p) => s + p.valor, 0)
      return {
        id: obra.id,
        nome: obra.nome,
        status: obra.status,
        orcamento: obra.orcamento,
        saldo: entradas - saidas - pagtos,
        totalEntradas: entradas,
        totalSaidas: saidas + pagtos,
      }
    })

    // Ultimas movimentacoes
    const ultimasMovimentacoes = [
      ...lancamentos.map((l) => ({
        id: l.id,
        tipo: l.tipo === 'entrada' ? 'entrada' : 'saida',
        descricao: l.descricao,
        valor: l.valor,
        data: l.data,
        obra: l.obra.nome,
        categoria: l.categoria,
      })),
      ...pagamentos.map((p) => ({
        id: p.id,
        tipo: 'pagamento',
        descricao: `${p.tipo} - ${p.funcionario.nome}`,
        valor: p.valor,
        data: p.data,
        obra: p.obra.nome,
        categoria: p.tipo,
      })),
    ]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10)

    return NextResponse.json({
      totalEntradas,
      totalSaidas,
      totalPagamentos,
      saldoGeral: totalEntradas - totalSaidas - totalPagamentos,
      obrasEmAndamento,
      obrasConcluidas,
      totalObras: obras.length,
      funcionariosAtivos: funcionarios,
      resumoObras,
      ultimasMovimentacoes,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar dados do dashboard' }, { status: 500 })
  }
}
