-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ID_CARD_FRONT', 'ID_CARD_BACK', 'KBIS', 'VEHICLE_REGISTRATION');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('NONE', 'BIKE', 'SCOOTER', 'CAR');

-- AlterTable
ALTER TABLE "carrier_profiles" ADD COLUMN     "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasOwnPrinter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vehicleType" "VehicleType" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "carrier_documents" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "carrier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carrier_documents_carrierId_type_key" ON "carrier_documents"("carrierId", "type");

-- AddForeignKey
ALTER TABLE "carrier_documents" ADD CONSTRAINT "carrier_documents_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
