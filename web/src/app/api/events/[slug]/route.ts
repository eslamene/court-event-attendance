import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, date: true, slug: true, logoPath: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...event,
    date: event.date.toISOString(),
  });
}
