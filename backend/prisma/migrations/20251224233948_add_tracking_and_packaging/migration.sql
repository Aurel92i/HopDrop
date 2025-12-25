-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "isTemporary" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "departedAt" TIMESTAMP(3),
ADD COLUMN     "departureLatitude" DOUBLE PRECISION,
ADD COLUMN     "departureLongitude" DOUBLE PRECISION,
ADD COLUMN     "estimatedArrival" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "parcels" ADD COLUMN     "itemCategory" TEXT,
ADD COLUMN     "itemPhotoUrl" TEXT,
ADD COLUMN     "packagingConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "packagingPhotoUrl" TEXT,
ADD COLUMN     "suggestedSize" "ParcelSize",
ADD COLUMN     "vendorPackagingConfirmedAt" TIMESTAMP(3);
