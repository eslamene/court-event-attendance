import { NextResponse } from "next/server";
import { staffLoginSchema } from "@/lib/i18n/schemas";
import { authenticateStaff, createStaffToken } from "@/lib/staff-auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import { jsonInvalidData } from "@/lib/i18n/responses";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonInvalidData();
  }

  const parsed = staffLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: await apiT("api.invalidCredentials") },
      { status: 400 }
    );
  }

  const user = await authenticateStaff(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json(
      { error: await apiT("api.invalidCredentials") },
      { status: 401 }
    );
  }

  const token = await createStaffToken(user.id, user.email, user.name);
  const events = await prisma.event.findMany({
    where: { isActive: true },
    orderBy: { date: "desc" },
    select: {
      id: true,
      name: true,
      date: true,
      slug: true,
      logoPath: true,
      seatingEnabled: true,
    },
  });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    events: events.map((e) => ({ ...e, date: e.date.toISOString() })),
  });
}
