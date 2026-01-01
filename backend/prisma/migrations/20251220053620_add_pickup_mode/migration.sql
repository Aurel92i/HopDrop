-- CreateEnum
CREATE TYPE "PickupMode" AS ENUM ('SCHEDULED', 'IMMEDIATE');

-- AlterTable
ALTER TABLE "parcels" ADD COLUMN     "pickupMode" "PickupMode" NOT NULL DEFAULT 'SCHEDULED';
