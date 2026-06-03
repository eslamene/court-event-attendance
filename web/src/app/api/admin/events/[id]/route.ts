import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateEventSchema } from "@/lib/validators";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "الفعالية غير موجودة" }, { status: 404 });
  }

  const data: {
    name?: string;
    date?: Date;
    isActive?: boolean;
    logoPath?: string | null;
  } = {};

  if (parsed.data.name) data.name = parsed.data.name.trim();
  if (parsed.data.date) data.date = new Date(parsed.data.date);
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.logoUrl !== undefined) {
    data.logoPath = parsed.data.logoUrl?.trim() || null;
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
