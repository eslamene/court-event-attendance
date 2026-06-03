import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeEventLogoFiles, saveEventLogo } from "@/lib/event-logo";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "الفعالية غير موجودة" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("logo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم اختيار صورة" }, { status: 400 });
  }

  await removeEventLogoFiles(id, event.logoPath);
  const saved = await saveEventLogo(id, file);
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id },
    data: { logoPath: saved.logoPath },
  });

  return NextResponse.json({ logoPath: updated.logoPath });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (existing?.logoPath) await removeEventLogoFiles(id, existing.logoPath);
  await prisma.event.update({
    where: { id },
    data: { logoPath: null },
  });

  return NextResponse.json({ success: true });
}
