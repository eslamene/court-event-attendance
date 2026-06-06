import { NextResponse } from "next/server";
import { auth, canManageSettings } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import {
  ensureDefaultRegistrationFormConfigSeeded,
  getBuiltinRegistrationFormConfig,
} from "@/lib/registration-form-config";

export async function POST() {
  const session = await auth();
  if (!session?.user || !(await canManageSettings(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const builtin = getBuiltinRegistrationFormConfig();
  await ensureDefaultRegistrationFormConfigSeeded();
  const existing = await prisma.registrationFormConfig.findFirst({
    where: { eventId: null },
  });

  const fieldsJson = JSON.stringify({ fields: builtin.fields });
  if (existing) {
    await prisma.registrationFormConfig.update({
      where: { id: existing.id },
      data: { fieldsJson },
    });
  }

  return NextResponse.json({
    fields: builtin.fields,
    message: await apiT("api.registrationFormReset"),
  });
}
