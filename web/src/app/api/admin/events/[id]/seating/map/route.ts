import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import { getSeatingMap } from "@/lib/seating";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: await apiT("api.unauthorized") }, { status: 401 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const tierId = searchParams.get("tierId") ?? undefined;

  try {
    const map = await getSeatingMap(id, { tierId });
    return NextResponse.json(map);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : await apiT("api.operationFailed"),
      },
      { status: 400 }
    );
  }
}
