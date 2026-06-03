import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiDict, apiT } from "@/lib/i18n/api";
import { createEventSchema } from "@/lib/i18n/schemas";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { buildRegistrationUrl } from "@/lib/app-url";
import { uniqueEventSlug } from "@/lib/slug";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: await apiT("api.unauthorized") }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { registrations: true } } },
  });

  return NextResponse.json(
    events.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date.toISOString(),
      slug: e.slug,
      logoPath: e.logoPath,
      isActive: e.isActive,
      registrationCount: e._count.registrations,
      registrationUrl: buildRegistrationUrl(e.slug),
    }))
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const dict = await apiDict();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const parsed = createEventSchema(dict).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? (await apiT("api.invalidData")),
      },
      { status: 400 }
    );
  }

  const slug = await uniqueEventSlug(parsed.data.name, async (s) => {
    const found = await prisma.event.findUnique({ where: { slug: s } });
    return Boolean(found);
  });

  const event = await prisma.event.create({
    data: {
      name: parsed.data.name.trim(),
      date: new Date(parsed.data.date),
      slug,
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.EVENT_CREATE,
    actor: auditActorFromSession(session.user),
    entityType: "event",
    entityId: event.id,
    entityLabel: event.name,
    metadata: { slug: event.slug, date: event.date.toISOString() },
    req,
  });

  return NextResponse.json({
    ...event,
    date: event.date.toISOString(),
    registrationUrl: buildRegistrationUrl(event.slug),
  });
}
