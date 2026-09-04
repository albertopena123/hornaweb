-- Multi-sesión de WhatsApp (2026-08-28).
-- El proyecto no usa prisma migrate (db push), así que este script deja la BD
-- exactamente como el schema y migra los datos existentes a la sesión "default".
-- Idempotente: se puede volver a ejecutar sin efecto.

BEGIN;

CREATE TABLE IF NOT EXISTS "WhatsappSession" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "phone"     TEXT,
    "active"    BOOLEAN NOT NULL DEFAULT true,
    "dailyCap"  INTEGER NOT NULL DEFAULT 150,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsappSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappSession_name_key" ON "WhatsappSession"("name");
CREATE INDEX IF NOT EXISTS "WhatsappSession_active_idx" ON "WhatsappSession"("active");

-- Sesión inicial: la que ya existía en WAHA (WAHA_SESSION=default).
INSERT INTO "WhatsappSession" ("id", "name", "label", "phone", "active", "dailyCap", "createdAt", "updatedAt")
VALUES ('sess_default', 'default', 'Número principal', NULL, true, 150, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- ── Campaign.sessionId ──
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
UPDATE "Campaign" SET "sessionId" = 'sess_default' WHERE "sessionId" IS NULL;
ALTER TABLE "Campaign" ALTER COLUMN "sessionId" SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "Campaign_sessionId_status_idx" ON "Campaign"("sessionId", "status");

-- ── Contador diario por sesión (cada número con su propio tope) ──
ALTER TABLE "MessagingDailyCounter" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
UPDATE "MessagingDailyCounter" SET "sessionId" = 'sess_default' WHERE "sessionId" IS NULL;
ALTER TABLE "MessagingDailyCounter" ALTER COLUMN "sessionId" SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE "MessagingDailyCounter" DROP CONSTRAINT "MessagingDailyCounter_pkey";
  ALTER TABLE "MessagingDailyCounter" ADD CONSTRAINT "MessagingDailyCounter_pkey" PRIMARY KEY ("day", "sessionId");
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MessagingDailyCounter" ADD CONSTRAINT "MessagingDailyCounter_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- El resto de tablas pertenece al rol de la aplicación; esta se creó desde postgres.
ALTER TABLE "WhatsappSession" OWNER TO hornaweb;

COMMIT;
