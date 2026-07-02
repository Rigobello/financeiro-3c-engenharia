import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const funcionario = await prisma.funcionario.findUnique({
      where: { id },
      include: {
        pagamentos: {
          orderBy: { data: 'desc' },
          include: { obra: { select: { nome: true } } },
        },
        funcionariosObra: {
          include: { obra: { select: { id: true, nome: true, status: true } } },
        },
      },
    })
    if (!funcionario) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
    return NextResponse.json(funcionario)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar funcionário' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    let fotoCaminho: string | undefined = undefined

    if (body.fotoBase64) {
      const dir = path.join(process.cwd(), 'public', 'uploads', 'funcionarios', id)
      fs.mkdirSync(dir, { recursive: true })
      const filePath = path.join(dir, 'foto.jpg')
      const base64 = body.fotoBase64.replace(/^data:image\/\w+;base64,/, '')
      fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
      fotoCaminho = `/uploads/funcionarios/${id}/foto.jpg`
    }

    const funcionario = await prisma.funcionario.update({
      where: { id },
      data: {
        nome: body.nome,
        cpf: body.cpf || null,
        cargo: body.cargo,
        salarioBase: parseFloat(body.salarioBase),
        valorHora: body.valorHora ? parseFloat(body.valorHora) : null,
        status: body.status,
        telefone: body.telefone || null,
        email: body.email || null,
        ...(fotoCaminho ? { fotoCaminho } : {}),
      },
    })
    return NextResponse.json(funcionario)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar funcionário' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.funcionario.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao excluir funcionário' }, { status: 500 })
  }
}
