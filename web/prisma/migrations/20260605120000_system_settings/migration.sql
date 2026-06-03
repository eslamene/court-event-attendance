-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "platformName" TEXT NOT NULL DEFAULT 'Court Events',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "qrInstructionsOverride" TEXT,
    "notifyEmailOnApprove" BOOLEAN NOT NULL DEFAULT true,
    "notifyWhatsAppOnApprove" BOOLEAN NOT NULL DEFAULT true,
    "notifySmsOnApprove" BOOLEAN NOT NULL DEFAULT false,
    "smsWhenWhatsAppUnavailable" BOOLEAN NOT NULL DEFAULT true,
    "emailProviderPreference" TEXT NOT NULL DEFAULT 'auto',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "requireRegistrationNotes" BOOLEAN NOT NULL DEFAULT false,
    "allowPublicRegistration" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- Seed default row
INSERT INTO "SystemSettings" ("id", "platformName", "updatedAt")
VALUES ('global', 'Court Events', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
