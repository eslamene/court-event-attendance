import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeEventLogoFiles } from "@/lib/event-logo";
import { apiDict, apiT } from "@/lib/i18n/api";
import { createUpdateEventSchema } from "@/lib/i18n/schemas";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { id } = await params;
  const dict = await apiDict();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const parsed = createUpdateEventSchema(dict).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? (await apiT("api.invalidData")),
      },
      { status: 400 }
    );
  }

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  const data: {
    name?: string;
    date?: Date;
    slug?: string;
    isActive?: boolean;
    logoPath?: string | null;
  } = {};

  if (parsed.data.name) data.name = parsed.data.name.trim();
  if (parsed.data.date) data.date = new Date(parsed.data.date);
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.logoUrl !== undefined) {
    data.logoPath = parsed.data.logoUrl?.trim() || null;
  }

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const taken = await prisma.event.findFirst({
      where: { slug: parsed.data.slug, NOT: { id } },
    });
    if (taken) {
      return NextResponse.json(
        { error: await apiT("api.eventSlugTaken") },
        { status: 409 }
      );
    }
    data.slug = parsed.data.slug;
  }

  const updated = await prisma.event.update({
    where: { id },
    data,
    include: { _count: { select: { registrations: true } } },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    date: updated.date.toISOString(),
    slug: updated.slug,
    logoPath: updated.logoPath,
    isActive: updated.isActive,
    registrationCount: updated._count.registrations,
    registrationUrl: `${baseUrl}/register/${updated.slug}`,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });

  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  if (event._count.registrations > 0) {
    return NextResponse.json(
      { error: await apiT("api.eventDeleteNotEmpty") },
      { status: 409 }
    );
  }

  if (event.logoPath) {
    await removeEventLogoFiles(id, event.logoPath);
  }

  await prisma.$transaction([
    prisma.scanLog.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } }),
  ]);

  return NextResponse.json({
    success: true,
    message: await apiT("api.eventDeleted"),
  });
}
