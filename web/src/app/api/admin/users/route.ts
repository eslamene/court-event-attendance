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
import { createUserSchema } from "@/lib/i18n/schemas";
import { jsonForbidden, jsonInvalidData } from "@/lib/i18n/responses";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return jsonForbidden();
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { approvedRegistrations: true, scanLogs: true } },
    },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      approvalsCount: u._count.approvedRegistrations,
      scansCount: u._count.scanLogs,
    }))
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return jsonForbidden();
  }

  const dict = await apiDict();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonInvalidData();
  }

  const parsed = createUserSchema(dict).safeParse(body);
  if (!parsed.success) {
    return jsonInvalidData(parsed.error.issues[0]?.message);
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (existing) {
    return NextResponse.json(
      { error: await apiT("api.emailInUse") },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase().trim(),
      name: parsed.data.name.trim(),
      role: parsed.data.role,
      passwordHash,
    },
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
    action: AUDIT_ACTIONS.USER_CREATE,
    actor: auditActorFromSession(session.user),
    entityType: "user",
    entityId: user.id,
    entityLabel: user.name,
    metadata: { email: user.email, role: user.role },
    req,
  });

  return NextResponse.json({
    ...user,
    createdAt: user.createdAt.toISOString(),
  });
}
