import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "./prisma-factory";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function isPrismaClientComplete(client: PrismaClient): boolean {
  return (
    "emailTemplate" in client &&
    "systemSettings" in client &&
    "registrationFormConfig" in client &&
    "auditLog" in client
  );
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientComplete(cached)) {
    return cached;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
