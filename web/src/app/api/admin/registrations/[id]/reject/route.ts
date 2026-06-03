import { NextResponse } from "next/server";
import { auth, canApprove } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import { jsonForbidden } from "@/lib/i18n/responses";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canApprove(session.user.role)) {
    return jsonForbidden();
  }

  const { id } = await params;
  const registration = await prisma.registration.findUnique({ where: { id } });

  if (!registration) {
    return NextResponse.json(
      { error: await apiT("api.registrationNotFound") },
      { status: 404 }
    );
  }

  if (registration.status !== "PENDING") {
    return NextResponse.json(
      { error: await apiT("api.cannotReject") },
      { status: 400 }
    );
  }

  const updated = await prisma.registration.update({
    where: { id },
    data: { status: "REJECTED", rejectedAt: new Date() },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
