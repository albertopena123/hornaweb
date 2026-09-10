-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('web', 'mobile');

-- CreateEnum
CREATE TYPE "SupporterStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "SupporterSource" AS ENUM ('admin', 'public');

-- CreateEnum
CREATE TYPE "District" AS ENUM ('tambopata', 'inambari', 'las_piedras', 'laberinto', 'manu', 'fitzcarrald', 'madre_de_dios', 'huepetuhe', 'inapari', 'iberia', 'tahuamanu');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('dni', 'ce', 'passport');

-- CreateEnum
CREATE TYPE "PersoneroSource" AS ENUM ('admin', 'public');

-- CreateEnum
CREATE TYPE "WhatsappStatus" AS ENUM ('unknown', 'yes', 'no');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('whatsapp');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'running', 'paused', 'finished', 'cancelled');

-- CreateEnum
CREATE TYPE "CampaignAudience" AS ENUM ('all', 'not_contacted', 'district');

-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed', 'no_whatsapp', 'opted_out', 'skipped');

-- CreateEnum
CREATE TYPE "CandidateCargo" AS ENUM ('gobernador', 'provincial', 'distrital');

-- CreateEnum
CREATE TYPE "ActaStatus" AS ENUM ('draft', 'enviada', 'en_revision', 'aprobada', 'observada', 'anulada');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ip" TEXT,
    "clientType" "ClientType" NOT NULL DEFAULT 'web',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supporter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "docType" "DocumentType" NOT NULL DEFAULT 'dni',
    "docNumber" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "gpsAccuracy" DOUBLE PRECISION,
    "district" "District" NOT NULL,
    "source" "SupporterSource" NOT NULL,
    "status" "SupporterStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "ip" TEXT,
    "createdById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supporter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Local" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "locality" TEXT,
    "district" "District" NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "levels" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personero" (
    "id" TEXT NOT NULL,
    "docType" "DocumentType" NOT NULL DEFAULT 'dni',
    "docNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "source" "PersoneroSource" NOT NULL DEFAULT 'admin',
    "district" "District",
    "localName" TEXT NOT NULL,
    "localAddress" TEXT,
    "mesa" TEXT NOT NULL,
    "aula" TEXT,
    "role" TEXT NOT NULL DEFAULT 'titular',
    "isSuplente" BOOLEAN NOT NULL DEFAULT false,
    "coordinatorName" TEXT NOT NULL,
    "coordinatorPhone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "whatsappNotifiedAt" TIMESTAMP(3),
    "credentialToken" TEXT,
    "isMesaMember" BOOLEAN NOT NULL DEFAULT false,
    "mesaMemberRole" TEXT,
    "experience" BOOLEAN,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectoralLocal" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "district" "District" NOT NULL,
    "province" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "totalMesas" INTEGER NOT NULL DEFAULT 0,
    "coordinatorName" TEXT,
    "coordinatorPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectoralLocal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectoralMesa" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "aula" TEXT,
    "onpePresidente" TEXT,
    "onpeSecretario" TEXT,
    "onpeSuplentes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectoralMesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imagePath" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "docType" "DocumentType" NOT NULL DEFAULT 'dni',
    "docNumber" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL,
    "district" "District",
    "source" TEXT NOT NULL,
    "whatsappStatus" "WhatsappStatus" NOT NULL DEFAULT 'unknown',
    "checkedAt" TIMESTAMP(3),
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "optedOutAt" TIMESTAMP(3),
    "optedOutReason" TEXT,
    "lastMessagedAt" TIMESTAMP(3),
    "importId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "consentConfirmed" BOOLEAN NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "invalid" INTEGER NOT NULL,
    "duplicatedInFile" INTEGER NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "dailyCap" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL DEFAULT 'whatsapp',
    "messageTemplate" TEXT NOT NULL,
    "audience" "CampaignAudience" NOT NULL,
    "district" "District",
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "dailyCap" INTEGER NOT NULL DEFAULT 150,
    "minDelaySec" INTEGER NOT NULL DEFAULT 45,
    "maxDelaySec" INTEGER NOT NULL DEFAULT 120,
    "windowStart" INTEGER NOT NULL DEFAULT 8,
    "windowEnd" INTEGER NOT NULL DEFAULT 20,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "pausedReason" TEXT,
    "rotationBatch" INTEGER NOT NULL DEFAULT 20,
    "cursorSessionId" TEXT,
    "cursorSent" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSession" (
    "campaignId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignSession_pkey" PRIMARY KEY ("campaignId","sessionId")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "RecipientStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "wahaMessageId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessagingDailyCounter" (
    "day" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MessagingDailyCounter_pkey" PRIMARY KEY ("day","sessionId")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "partyLogo" TEXT,
    "photoUrl" TEXT,
    "cargo" "CandidateCargo" NOT NULL DEFAULT 'gobernador',
    "order" INTEGER NOT NULL DEFAULT 1,
    "color" TEXT NOT NULL DEFAULT '#dc2626',
    "province" TEXT,
    "district" "District",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActaElectoral" (
    "id" TEXT NOT NULL,
    "mesaNumber" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "personeroId" TEXT,
    "photoUrl" TEXT NOT NULL,
    "status" "ActaStatus" NOT NULL DEFAULT 'enviada',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "electionType" TEXT NOT NULL DEFAULT 'gobernador',
    "observationReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "votosBlancos" INTEGER NOT NULL DEFAULT 0,
    "votosNulos" INTEGER NOT NULL DEFAULT 0,
    "votosImpugnados" INTEGER NOT NULL DEFAULT 0,
    "totalVotos" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActaElectoral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActaVoto" (
    "id" TEXT NOT NULL,
    "actaId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActaVoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_category_idx" ON "Permission"("category");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Supporter_status_idx" ON "Supporter"("status");

-- CreateIndex
CREATE INDEX "Supporter_district_idx" ON "Supporter"("district");

-- CreateIndex
CREATE INDEX "Supporter_createdAt_idx" ON "Supporter"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Supporter_docType_docNumber_key" ON "Supporter"("docType", "docNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Local_code_key" ON "Local"("code");

-- CreateIndex
CREATE INDEX "Local_district_idx" ON "Local"("district");

-- CreateIndex
CREATE UNIQUE INDEX "Personero_credentialToken_key" ON "Personero"("credentialToken");

-- CreateIndex
CREATE INDEX "Personero_district_idx" ON "Personero"("district");

-- CreateIndex
CREATE INDEX "Personero_active_idx" ON "Personero"("active");

-- CreateIndex
CREATE INDEX "Personero_mesa_idx" ON "Personero"("mesa");

-- CreateIndex
CREATE UNIQUE INDEX "Personero_docType_docNumber_key" ON "Personero"("docType", "docNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ElectoralLocal_code_key" ON "ElectoralLocal"("code");

-- CreateIndex
CREATE INDEX "ElectoralLocal_district_idx" ON "ElectoralLocal"("district");

-- CreateIndex
CREATE INDEX "ElectoralLocal_province_idx" ON "ElectoralLocal"("province");

-- CreateIndex
CREATE UNIQUE INDEX "ElectoralMesa_number_key" ON "ElectoralMesa"("number");

-- CreateIndex
CREATE INDEX "ElectoralMesa_localId_idx" ON "ElectoralMesa"("localId");

-- CreateIndex
CREATE INDEX "Announcement_published_startsAt_endsAt_idx" ON "Announcement"("published", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phone_key" ON "Contact"("phone");

-- CreateIndex
CREATE INDEX "Contact_optedOut_idx" ON "Contact"("optedOut");

-- CreateIndex
CREATE INDEX "Contact_whatsappStatus_idx" ON "Contact"("whatsappStatus");

-- CreateIndex
CREATE INDEX "Contact_district_idx" ON "Contact"("district");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_docType_docNumber_key" ON "Contact"("docType", "docNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSession_name_key" ON "WhatsappSession"("name");

-- CreateIndex
CREATE INDEX "WhatsappSession_active_idx" ON "WhatsappSession"("active");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "CampaignSession_sessionId_idx" ON "CampaignSession"("sessionId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_campaignId_status_idx" ON "CampaignRecipient"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_contactId_key" ON "CampaignRecipient"("campaignId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_wahaMessageId_key" ON "CampaignRecipient"("wahaMessageId");

-- CreateIndex
CREATE INDEX "Candidate_cargo_active_idx" ON "Candidate"("cargo", "active");

-- CreateIndex
CREATE INDEX "Candidate_order_idx" ON "Candidate"("order");

-- CreateIndex
CREATE INDEX "ActaElectoral_status_idx" ON "ActaElectoral"("status");

-- CreateIndex
CREATE INDEX "ActaElectoral_electionType_idx" ON "ActaElectoral"("electionType");

-- CreateIndex
CREATE INDEX "ActaElectoral_localId_idx" ON "ActaElectoral"("localId");

-- CreateIndex
CREATE UNIQUE INDEX "ActaElectoral_mesaNumber_electionType_key" ON "ActaElectoral"("mesaNumber", "electionType");

-- CreateIndex
CREATE INDEX "ActaVoto_candidateId_idx" ON "ActaVoto"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ActaVoto_actaId_candidateId_key" ON "ActaVoto"("actaId", "candidateId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supporter" ADD CONSTRAINT "Supporter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supporter" ADD CONSTRAINT "Supporter_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personero" ADD CONSTRAINT "Personero_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personero" ADD CONSTRAINT "Personero_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectoralMesa" ADD CONSTRAINT "ElectoralMesa_localId_fkey" FOREIGN KEY ("localId") REFERENCES "ElectoralLocal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ContactImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactImport" ADD CONSTRAINT "ContactImport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSession" ADD CONSTRAINT "CampaignSession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSession" ADD CONSTRAINT "CampaignSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessagingDailyCounter" ADD CONSTRAINT "MessagingDailyCounter_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaElectoral" ADD CONSTRAINT "ActaElectoral_localId_fkey" FOREIGN KEY ("localId") REFERENCES "ElectoralLocal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaElectoral" ADD CONSTRAINT "ActaElectoral_personeroId_fkey" FOREIGN KEY ("personeroId") REFERENCES "Personero"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaElectoral" ADD CONSTRAINT "ActaElectoral_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaVoto" ADD CONSTRAINT "ActaVoto_actaId_fkey" FOREIGN KEY ("actaId") REFERENCES "ActaElectoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaVoto" ADD CONSTRAINT "ActaVoto_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
