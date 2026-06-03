import { prisma } from "./db";
import {
  getBuiltinRegistrationFormConfig,
  parseRegistrationFormConfigJson,
  type RegistrationFormConfigRecord,
} from "./registration-form-config-shared";

export * from "./registration-form-config-shared";

export async function ensureDefaultRegistrationFormConfigSeeded(): Promise<void> {
  const existing = await prisma.registrationFormConfig.findFirst({
    where: { eventId: null },
  });
  if (existing) return;

  const builtin = getBuiltinRegistrationFormConfig();
  await prisma.registrationFormConfig.create({
    data: {
      eventId: null,
      fieldsJson: JSON.stringify({ fields: builtin.fields }),
    },
  });
}

export async function getDefaultRegistrationFormConfigFromDb(): Promise<RegistrationFormConfigRecord | null> {
  const row = await prisma.registrationFormConfig.findFirst({
    where: { eventId: null },
  });
  if (!row) return null;
  return {
    fields: parseRegistrationFormConfigJson(row.fieldsJson),
    source: "default",
  };
}

export async function getEventRegistrationFormConfigFromDb(
  eventId: string
): Promise<RegistrationFormConfigRecord | null> {
  const row = await prisma.registrationFormConfig.findUnique({
    where: { eventId },
  });
  if (!row) return null;
  return {
    fields: parseRegistrationFormConfigJson(row.fieldsJson),
    source: "event",
  };
}

export async function resolveRegistrationFormConfigForEvent(
  eventId?: string | null
): Promise<RegistrationFormConfigRecord> {
  if (eventId) {
    const eventConfig = await getEventRegistrationFormConfigFromDb(eventId);
    if (eventConfig) return eventConfig;
  }
  const defaultConfig = await getDefaultRegistrationFormConfigFromDb();
  if (defaultConfig) return defaultConfig;
  return getBuiltinRegistrationFormConfig();
}
