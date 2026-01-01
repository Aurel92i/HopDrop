-- AlterTable
ALTER TABLE "parcels" ADD COLUMN     "packagingRejectedAt" TIMESTAMP(3),
ADD COLUMN     "packagingRejectionReason" TEXT;
