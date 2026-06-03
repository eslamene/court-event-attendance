import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import {
  ensureDefaultRegistrationFormConfigSeeded,
  getBuiltinRegistrationFormConfig,
  getDefaultRegistrationFormConfigFromDb,
  getEventRegistrationFormConfigFromDb,
  validateRegistrationFormConfigPayload,
  type RegistrationFormFieldConfig,
} from "@/lib/registration-form-config";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || !canManageEvents(session.user.role)) {
      return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
    }

    const { id } = await params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json(
        { error: await apiT("api.eventNotFound") },
        { status: 404 }
      );
    }

    await ensureDefaultRegistrationFormConfigSeeded();
    const defaultConfig =
      (await getDefaultRegistrationFormConfigFromDb()) ??
      getBuiltinRegistrationFormConfig();
    const override = await getEventRegistrationFormConfigFromDb(id);

    return NextResponse.json({
      eventId: id,
      eventName: event.name,
      hasOverride: Boolean(override),
      fields: override?.fields ?? defaultConfig.fields,
      defaultFields: defaultConfig.fields,
    });
  } catch (e) {
    console.error("[registration-form GET]", e);
    return NextResponse.json(
      { error: await apiT("api.operationFailed") },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
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

  const fieldsJson = JSON.stringify({ fields: validated.fields });
  await prisma.registrationFormConfig.upsert({
    where: { eventId: id },
    update: { fieldsJson },
    create: { eventId: id, fieldsJson },
  });

  return NextResponse.json({
    fields: validated.fields,
    message: await apiT("api.registrationFormSaved"),
  });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { id } = await params;
  await prisma.registrationFormConfig.deleteMany({ where: { eventId: id } });

  return NextResponse.json({
    message: await apiT("api.registrationFormCleared"),
  });
}
