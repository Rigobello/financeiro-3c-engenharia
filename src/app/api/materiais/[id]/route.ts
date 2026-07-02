import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, isAdmin } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

function isAlmox(grupos: string[]) {
  return grupos.includes('Almoxarifado') || isAdmin({ grupos } as any)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isAlmox(session.grupos)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  let fotoCaminho: string | undefined = undefined

  if (body.fotoBase64) {
    const dir = path.join(process.cwd(), 'public', 'uploads', 'materiais', id)
    fs.mkdirSync(dir, { recursive: true })
    const filePath = path.join(dir, 'foto.jpg')
    const base64 = body.fotoBase64.replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
    fotoCaminho = `/uploads/materiais/${id}/foto.jpg`
  }

  const material = await prisma.material.update({
    where: { id },
    data: {
      nome: body.nome,
      descricao: body.descricao ?? null,
      codigo: body.codigo ?? null,
      categoria: body.categoria ?? null,
      unidade: body.unidade ?? 'un',
      quantidadeTotal: Number(body.quantidadeTotal) ?? 1,
      ...(fotoCaminho ? { fotoCaminho } : {}),
    },
  })

  return NextResponse.json(material)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params
  await prisma.material.update({ where: { id }, data: { status: 'inativo' } })
  return NextResponse.json({ ok: true })
}
