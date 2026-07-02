-- AlterTable
ALTER TABLE "Funcionario" ADD COLUMN "fotoCaminho" TEXT;
ALTER TABLE "Funcionario" ADD COLUMN "valorHora" REAL;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN "fotoCaminho" TEXT;

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroPonto_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RegistroPonto_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RegistroPonto_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RegistroPonto" ("createdAt", "dataHora", "funcionarioId", "id", "obraId", "observacao", "registradoPorId", "tipo") SELECT "createdAt", "dataHora", "funcionarioId", "id", "obraId", "observacao", "registradoPorId", "tipo" FROM "RegistroPonto";
DROP TABLE "RegistroPonto";
ALTER TABLE "new_RegistroPonto" RENAME TO "RegistroPonto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
