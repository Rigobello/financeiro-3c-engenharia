-- AlterTable
ALTER TABLE "MovimentacaoMaterial" ADD COLUMN "responsavelNome" TEXT;

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AtividadeObra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "obraId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "peso" INTEGER NOT NULL DEFAULT 1,
    "unidade" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AtividadeObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistroAtividade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atividadeObraId" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "percentualPlanejado" REAL NOT NULL DEFAULT 0,
    "percentualExecutado" REAL NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroAtividade_atividadeObraId_fkey" FOREIGN KEY ("atividadeObraId") REFERENCES "AtividadeObra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegistroAtividade_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RegistroPonto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "funcionarioId" TEXT NOT NULL,
    "obraId" TEXT,
    "tipo" TEXT NOT NULL,
    "dataHora" DATETIME NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "observacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'em_aberto',
    "alertaImpar" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroPonto_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RegistroPonto_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RegistroPonto_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RegistroPonto" ("createdAt", "dataHora", "funcionarioId", "id", "obraId", "observacao", "registradoPorId", "status", "tipo") SELECT "createdAt", "dataHora", "funcionarioId", "id", "obraId", "observacao", "registradoPorId", "status", "tipo" FROM "RegistroPonto";
DROP TABLE "RegistroPonto";
ALTER TABLE "new_RegistroPonto" RENAME TO "RegistroPonto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroAtividade_atividadeObraId_semana_key" ON "RegistroAtividade"("atividadeObraId", "semana");
