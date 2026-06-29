import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const funcionarios = await prisma.funcionario.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { pagamentos: true, funcionariosObra: true } },
        pagamentos: { select: { valor: true } },
        funcionariosObra: {
          include: { obra: { select: { nome: true, status: true } } },
        },
      },
    })

    return NextResponse.json(
      funcionarios.map((f) => ({
        ...f,
        totalRecebido: f.pagamentos.reduce((s, p) => s + p.valor, 0),
        obrasAtivas: f.funcionariosObra.filter(
          (fo) => fo.obra.status === 'em_andamento' && !fo.dataFim
        ).length,
      }))
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar funcionários' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const funcionario = await prisma.funcionario.create({
      data: {
        nome: body.nome,
        cpf: body.cpf || null,
        cargo: body.cargo,
        salarioBase: parseFloat(body.salarioBase),
        status: body.status || 'ativo',
        telefone: body.telefone || null,
        email: body.email || null,
      },
    })
    return NextResponse.json(funcionario, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar funcionário' }, { status: 500 })
  }
}
