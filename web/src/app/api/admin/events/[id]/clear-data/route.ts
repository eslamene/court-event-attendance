import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { verifyAdminPassword } from "@/lib/admin-password";
import { prisma } from "@/lib/db";
import { clearEventDataSchema } from "@/lib/validators";

export async function POST(
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

  const parsed = clearEventDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const authCheck = await verifyAdminPassword(
    session.user.id,
    parsed.data.adminPassword
  );
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!event) {
    return NextResponse.json({ error: "الفعالية غير موجودة" }, { status: 404 });
  }

  const [scanResult, regResult] = await prisma.$transaction([
    prisma.scanLog.deleteMany({ where: { eventId: id } }),
    prisma.registration.deleteMany({ where: { eventId: id } }),
  ]);

  return NextResponse.json({
    success: true,
    deletedRegistrations: regResult.count,
    deletedScanLogs: scanResult.count,
    message: `تم مسح ${regResult.count} تسجيل و ${scanResult.count} سجل مسح`,
  });
}
