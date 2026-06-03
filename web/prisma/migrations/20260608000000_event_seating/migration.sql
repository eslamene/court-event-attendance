-- AlterTable
ALTER TABLE "Event" ADD COLUMN "seatingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SeatTier" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seatCount" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatTier_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN "seatTierId" TEXT,
ADD COLUMN "seatNumber" INTEGER;

-- CreateIndex
CREATE INDEX "SeatTier_eventId_idx" ON "SeatTier"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_seatTierId_seatNumber_key" ON "Registration"("seatTierId", "seatNumber");

-- AddForeignKey
ALTER TABLE "SeatTier" ADD CONSTRAINT "SeatTier_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_seatTierId_fkey" FOREIGN KEY ("seatTierId") REFERENCES "SeatTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
