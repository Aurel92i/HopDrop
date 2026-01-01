-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "autoConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clientConfirmedDeliveryAt" TIMESTAMP(3),
ADD COLUMN     "clientContestedAt" TIMESTAMP(3),
ADD COLUMN     "contestReason" TEXT,
ADD COLUMN     "deliveryConfirmationDeadline" TIMESTAMP(3),
ADD COLUMN     "deliveryProofUrl" TEXT;
