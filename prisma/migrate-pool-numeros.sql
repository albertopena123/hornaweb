-- Pool de números por campaña con rotación de turnos (2026-08-28).
-- Sustituye a Campaign.sessionId (un único número) por la tabla CampaignSession (varios).
-- Requiere haber aplicado antes migrate-multisesion.sql. Idempotente.

BEGIN;

CREATE TABLE IF NOT EXISTS "CampaignSession" (
    "campaignId" TEXT NOT NULL,
    "sessionId"  TEXT NOT NULL,
    "position"   INTEGER NOT NULL,
    "sentCount"  INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CampaignSession_pkey" PRIMARY KEY ("campaignId", "sessionId")
);
CREATE INDEX IF NOT EXISTS "CampaignSession_sessionId_idx" ON "CampaignSession"("sessionId");
DO $$ BEGIN
  ALTER TABLE "CampaignSession" ADD CONSTRAINT "CampaignSession_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CampaignSession" ADD CONSTRAINT "CampaignSession_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cada campaña existente pasa a un pool de un solo número (el que tenía), conservando su contador.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Campaign' AND column_name = 'sessionId') THEN
    INSERT INTO "CampaignSession" ("campaignId", "sessionId", "position", "sentCount")
    SELECT "id", "sessionId", 0, "sentCount" FROM "Campaign" WHERE "sessionId" IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

ALTER TABLE "Campaign"
  ADD COLUMN IF NOT EXISTS "rotationBatch"   INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS "cursorSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "cursorSent"      INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_sessionId_fkey";
DROP INDEX IF EXISTS "Campaign_sessionId_status_idx";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "sessionId";

-- Misma regla que el resto del esquema: las tablas pertenecen al rol de la app.
ALTER TABLE "CampaignSession" OWNER TO hornaweb;

COMMIT;
