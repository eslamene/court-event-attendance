import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiDict, apiT } from "@/lib/i18n/api";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { createUpdateUserSchema } from "@/lib/i18n/schemas";
import { jsonForbidden, jsonInvalidData } from "@/lib/i18n/responses";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return jsonForbidden();
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json(
      { error: await apiT("api.cannotEditSelf") },
      { status: 400 }
    );
  }

  const dict = await apiDict();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonInvalidData();
  }

  const parsed = createUpdateUserSchema(dict).safeParse(body);
  if (!parsed.success) {
    return jsonInvalidData(parsed.error.issues[0]?.message);
  }

  const data = parsed.data;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: await apiT("api.userNotFound") },
      { status: 404 }
    );
  }

  if (
    existing.role === "ADMIN" &&
    ((data.role && data.role !== "ADMIN") ||
      data.isActive === false)
  ) {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, NOT: { id } },
    });
    if (activeAdmins === 0) {
      return NextResponse.json(
        { error: await apiT("api.lastAdminRequired") },
        { status: 400 }
      );
    }
  }

  if (data.email) {
    const dup = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), NOT: { id } },
    });
    if (dup) {
      return NextResponse.json(
        { error: await apiT("api.emailInUse") },
        { status: 409 }
      );
    }
  }

  const updateData = {
    ...(data.name ? { name: data.name.trim() } : {}),
    ...(data.email ? { email: data.email.toLowerCase().trim() } : {}),
    ...(data.role ? { role: data.role } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    ...(data.password
      ? { passwordHash: await bcrypt.hash(data.password, 12) }
      : {}),
  };

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.USER_UPDATE,
    actor: auditActorFromSession(session.user),
    entityType: "user",
    entityId: updated.id,
    entityLabel: updated.name,
    metadata: {
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: data.isActive,
      passwordChanged: Boolean(data.password),
    },
    req,
  });

  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return jsonForbidden();
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json(
      { error: await apiT("api.cannotDeleteSelf") },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json(
      { error: await apiT("api.userNotFound") },
      { status: 404 }
    );
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
