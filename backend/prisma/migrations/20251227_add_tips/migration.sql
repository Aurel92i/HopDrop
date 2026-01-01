-- CreateTable
CREATE TABLE "tips" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tips_parcelId_key" ON "tips"("parcelId");

-- CreateIndex
CREATE UNIQUE INDEX "tips_missionId_key" ON "tips"("missionId");

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
