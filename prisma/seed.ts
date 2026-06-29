import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Criar grupos
  const grupos = [
    { nome: 'Administrador' },
    { nome: 'Engenheiro' },
    { nome: 'Usuário' },
  ]

  for (const g of grupos) {
    await prisma.grupo.upsert({
      where: { nome: g.nome },
      update: {},
      create: g,
    })
    console.log(`✓ Grupo "${g.nome}" criado`)
  }

  // Criar usuário Administrador
  const passwordHash = await bcrypt.hash('adm20172', 12)

  const admin = await prisma.user.upsert({
    where: { username: 'Administrador' },
    update: {},
    create: {
      username: 'Administrador',
      name: 'Administrador',
      passwordHash,
      status: 'ativo',
    },
  })

  // Associar ao grupo Administrador
  const grupoAdmin = await prisma.grupo.findUnique({ where: { nome: 'Administrador' } })
  if (grupoAdmin) {
    await prisma.userGrupo.upsert({
      where: { userId_grupoId: { userId: admin.id, grupoId: grupoAdmin.id } },
      update: {},
      create: { userId: admin.id, grupoId: grupoAdmin.id },
    })
    console.log(`✓ Usuário "Administrador" criado e adicionado ao grupo Administrador`)
  }

  console.log('✅ Seed concluído!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
