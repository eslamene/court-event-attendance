import "dotenv/config";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src/lib/prisma-factory";
import { ensureDefaultEmailTemplateSeeded } from "../src/lib/email-template";
import { ensureDefaultRegistrationFormConfigSeeded } from "../src/lib/registration-form-config";
import { ensureSystemSettingsSeeded } from "../src/lib/system-settings";
import { seedDictionary } from "../src/lib/i18n/seed";
import { ensureRolesSeeded, getRoleByCode } from "../src/lib/roles-store";

const prisma = createPrismaClient();

async function main() {
  await ensureRolesSeeded();
  const adminRole = await getRoleByCode("ADMIN");
  const managerRole = await getRoleByCode("APPROVAL_MANAGER");
  const staffRole = await getRoleByCode("EVENT_STAFF");

  if (!adminRole || !managerRole || !staffRole) {
    throw new Error("System roles were not seeded");
  }

  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD || "Admin@123",
    12
  );

  const admin = await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL || "admin@court.local" },
    update: {},
    create: {
      email: process.env.SEED_ADMIN_EMAIL || "admin@court.local",
      name: "مدير النظام",
      passwordHash,
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@court.local" },
    update: {},
    create: {
      email: "manager@court.local",
      name: "مدير الموافقات",
      passwordHash,
      roleId: managerRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@court.local" },
    update: {},
    create: {
      email: "staff@court.local",
      name: "طاقم الاستقبال",
      passwordHash,
      roleId: staffRole.id,
    },
  });

  const eventDate = new Date("2026-06-15T09:00:00");
  await prisma.event.upsert({
    where: { slug: "golden-jubilee-2026" },
    update: {},
    create: {
      name: "اليوبيل الذهبي للنيابة العامة لدى محكمة النقض",
      date: eventDate,
      slug: "golden-jubilee-2026",
      isActive: true,
    },
  });

  await seedDictionary();
  await ensureDefaultEmailTemplateSeeded();
  await ensureDefaultRegistrationFormConfigSeeded();
  await ensureSystemSettingsSeeded();
  console.log("Dictionary seeded (ar, en).");
  console.log("Default email template seeded.");
  console.log("Default registration form seeded.");
  console.log("System settings seeded.");
  console.log("Seed complete.");
  console.log("Admin:", admin.email);
  console.log("Manager: manager@court.local");
  console.log("Staff (mobile): staff@court.local");
  console.log("Registration slug: golden-jubilee-2026");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
