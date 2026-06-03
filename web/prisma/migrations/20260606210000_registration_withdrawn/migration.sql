-- Allow judges to withdraw / apologize for not attending
ALTER TYPE "RegistrationStatus" ADD VALUE 'WITHDRAWN';

ALTER TABLE "Registration" ADD COLUMN "withdrawnAt" TIMESTAMP(3);
ALTER TABLE "Registration" ADD COLUMN "withdrawalNote" TEXT;
