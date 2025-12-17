-- CreateEnum
CREATE TYPE "OrgListingContactType" AS ENUM ('SENT', 'BUYING', 'SELLING');

-- AlterTable
ALTER TABLE "OrgTransaction" ADD COLUMN     "buyerPersonId" TEXT,
ADD COLUMN     "sellerPersonId" TEXT;

-- AlterTable
ALTER TABLE "ContractInstance" ADD COLUMN     "buyerPersonId" TEXT,
ADD COLUMN     "sellerPersonId" TEXT;

-- CreateTable
CREATE TABLE "OrgListingContact" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "OrgListingContactType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgListingContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgListingContact_listingId_type_idx" ON "OrgListingContact"("listingId", "type");

-- CreateIndex
CREATE INDEX "OrgListingContact_personId_type_idx" ON "OrgListingContact"("personId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "OrgListingContact_listingId_personId_type_key" ON "OrgListingContact"("listingId", "personId", "type");

-- CreateIndex
CREATE INDEX "OrgTransaction_organizationId_buyerPersonId_idx" ON "OrgTransaction"("organizationId", "buyerPersonId");

-- CreateIndex
CREATE INDEX "OrgTransaction_organizationId_sellerPersonId_idx" ON "OrgTransaction"("organizationId", "sellerPersonId");

-- CreateIndex
CREATE INDEX "ContractInstance_organizationId_buyerPersonId_idx" ON "ContractInstance"("organizationId", "buyerPersonId");

-- CreateIndex
CREATE INDEX "ContractInstance_organizationId_sellerPersonId_idx" ON "ContractInstance"("organizationId", "sellerPersonId");

-- AddForeignKey
ALTER TABLE "OrgListingContact" ADD CONSTRAINT "OrgListingContact_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "OrgListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgListingContact" ADD CONSTRAINT "OrgListingContact_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgTransaction" ADD CONSTRAINT "OrgTransaction_buyerPersonId_fkey" FOREIGN KEY ("buyerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgTransaction" ADD CONSTRAINT "OrgTransaction_sellerPersonId_fkey" FOREIGN KEY ("sellerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractInstance" ADD CONSTRAINT "ContractInstance_buyerPersonId_fkey" FOREIGN KEY ("buyerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractInstance" ADD CONSTRAINT "ContractInstance_sellerPersonId_fkey" FOREIGN KEY ("sellerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

