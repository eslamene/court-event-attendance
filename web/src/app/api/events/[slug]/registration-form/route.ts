import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import { resolveRegistrationFormConfigForEvent } from "@/lib/registration-form-config";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug, isActive: true },
    select: { id: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  const config = await resolveRegistrationFormConfigForEvent(event.id);

  return NextResponse.json({
    fields: config.fields.filter((f) => f.enabled),
  });
}
