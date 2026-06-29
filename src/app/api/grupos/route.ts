import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const grupos = await prisma.grupo.findMany({ orderBy: { nome: 'asc' } })
    return NextResponse.json(grupos)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar grupos' }, { status: 500 })
  }
}
