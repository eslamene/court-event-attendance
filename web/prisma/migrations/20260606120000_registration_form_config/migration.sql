-- CreateTable
CREATE TABLE "RegistrationFormConfig" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "fieldsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationFormConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationFormConfig_eventId_key" ON "RegistrationFormConfig"("eventId");

-- AddForeignKey
ALTER TABLE "RegistrationFormConfig" ADD CONSTRAINT "RegistrationFormConfig_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
