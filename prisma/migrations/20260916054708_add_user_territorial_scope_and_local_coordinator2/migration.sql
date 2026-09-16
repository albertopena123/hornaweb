-- AlterTable
ALTER TABLE "ElectoralLocal" ADD COLUMN     "coordinator2Dni" TEXT,
ADD COLUMN     "coordinator2Name" TEXT,
ADD COLUMN     "coordinator2Phone" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "assignedDistrict" "District",
ADD COLUMN     "assignedLocalId" TEXT,
ADD COLUMN     "assignedProvince" TEXT,
ADD COLUMN     "dni" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "scopeType" TEXT NOT NULL DEFAULT 'departamental';

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");

-- CreateIndex
CREATE INDEX "User_scopeType_idx" ON "User"("scopeType");

-- CreateIndex
CREATE INDEX "User_assignedLocalId_idx" ON "User"("assignedLocalId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_assignedLocalId_fkey" FOREIGN KEY ("assignedLocalId") REFERENCES "ElectoralLocal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
