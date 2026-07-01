import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, isAdmin } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; fotoId: string }> }
) {
  const session = await getSession()
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { fotoId } = await params

  const foto = await prisma.fotoObra.findUnique({ where: { id: fotoId } })
  if (!foto) return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })

  // Remover arquivo do disco
  try {
    const filepath = path.join(process.cwd(), 'public', foto.imagemPath)
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
  } catch {
    // ignora erro de arquivo não encontrado
  }

  await prisma.fotoObra.delete({ where: { id: fotoId } })
  return NextResponse.json({ ok: true })
}
