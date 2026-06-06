import { NextResponse } from "next/server";
import { auth, canManageSettings } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import {
  ensureDefaultRegistrationFormConfigSeeded,
  getBuiltinRegistrationFormConfig,
  getDefaultRegistrationFormConfigFromDb,
  validateRegistrationFormConfigPayload,
  type RegistrationFormFieldConfig,
} from "@/lib/registration-form-config";

export async function GET() {
  const session = await auth();
  if (!session?.user || !(await canManageSettings(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  await ensureDefaultRegistrationFormConfigSeeded();
  const config =
    (await getDefaultRegistrationFormConfigFromDb()) ??
    getBuiltinRegistrationFormConfig();

  return NextResponse.json({
    fields: config.fields,
    source: config.source,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canManageSettings(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const { fields } = body as { fields?: RegistrationFormFieldConfig[] };
  if (!fields?.length) {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const validated = validateRegistrationFormConfigPayload(fields);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  await ensureDefaultRegistrationFormConfigSeeded();
  const existing = await prisma.registrationFormConfig.findFirst({
    where: { eventId: null },
  });

  const fieldsJson = JSON.stringify({ fields: validated.fields });
  const saved = existing
    ? await prisma.registrationFormConfig.update({
        where: { id: existing.id },
        data: { fieldsJson },
      })
    : await prisma.registrationFormConfig.create({
        data: { eventId: null, fieldsJson },
      });

  return NextResponse.json({
    fields: validated.fields,
    message: await apiT("api.registrationFormSaved"),
  });
}
