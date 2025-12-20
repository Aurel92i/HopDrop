/*
  Warnings:

  - You are about to drop the column `carrierId` on the `parcels` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Carrier" AS ENUM ('VINTED', 'MONDIAL_RELAY', 'COLISSIMO', 'CHRONOPOST', 'RELAIS_COLIS', 'UPS', 'OTHER');

-- DropForeignKey
ALTER TABLE "parcels" DROP CONSTRAINT "parcels_carrierId_fkey";

-- AlterTable
ALTER TABLE "parcels" DROP COLUMN "carrierId",
ADD COLUMN     "assignedCarrierId" TEXT,
ADD COLUMN     "carrier" "Carrier" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "hasShippingLabel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shippingLabelUrl" TEXT;

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_assignedCarrierId_fkey" FOREIGN KEY ("assignedCarrierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
