import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, isAdmin } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Only admins can change status
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Apenas administradores podem alterar o status de ponto' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const allowed = ['em_aberto', 'aguarda_pagamento', 'pago']
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const ponto = await prisma.registroPonto.update({
    where: { id },
    data: { status: body.status },
  })

  return NextResponse.json(ponto)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (!isAdmin(session) && !session.grupos.includes('Ponto'))) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params
  await prisma.registroPonto.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
