import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const fotos = await prisma.fotoObra.findMany({
    where: { obraId: id },
    include: { user: { select: { name: true } } },
    orderBy: { dataRegistro: 'desc' },
  })

  return NextResponse.json(fotos)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id: obraId } = await params
  const body = await req.json()

  if (!body.imagemBase64 || !body.dataRegistro) {
    return NextResponse.json({ error: 'imagemBase64 e dataRegistro são obrigatórios' }, { status: 400 })
  }

  // Salvar arquivo no disco
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'obras', obraId)
  fs.mkdirSync(uploadsDir, { recursive: true })

  const filename = `${Date.now()}.jpg`
  const filepath = path.join(uploadsDir, filename)

  // Remove data URL prefix se presente
  const base64Data = body.imagemBase64.replace(/^data:image\/\w+;base64,/, '')
  fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'))

  const imagemPath = `/uploads/obras/${obraId}/${filename}`

  const foto = await prisma.fotoObra.create({
    data: {
      obraId,
      userId: session.userId,
      imagemPath,
      descricao: body.descricao || null,
      dataRegistro: new Date(body.dataRegistro),
    },
    include: { user: { select: { name: true } } },
  })

  return NextResponse.json(foto, { status: 201 })
}
