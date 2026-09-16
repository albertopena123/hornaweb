-- AlterTable
ALTER TABLE "ElectoralLocal" ADD COLUMN     "coordinatorDni" TEXT;

-- CreateTable
CREATE TABLE "ElectorConsulta" (
    "dni" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "miembroMesa" BOOLEAN NOT NULL DEFAULT false,
    "cargo" TEXT,
    "localVotacion" TEXT,
    "direccion" TEXT,
    "referencia" TEXT,
    "ubigeo" TEXT,
    "mesaSufragio" TEXT,
    "orden" TEXT,
    "tipoVoto" TEXT,
    "localLatitud" TEXT,
    "localLongitud" TEXT,
    "codigoLocal" TEXT,
    "rawPayload" JSONB,
    "consultedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectorConsulta_pkey" PRIMARY KEY ("dni")
);

-- CreateIndex
CREATE INDEX "ElectorConsulta_mesaSufragio_idx" ON "ElectorConsulta"("mesaSufragio");

-- CreateIndex
CREATE INDEX "ElectorConsulta_ubigeo_idx" ON "ElectorConsulta"("ubigeo");
