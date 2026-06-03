import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiDict, apiT } from "@/lib/i18n/api";
import {
  createRegistrationSchema,
  normalizeMobile,
} from "@/lib/i18n/schemas";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const dict = await apiDict();
  const event = await prisma.event.findUnique({
    where: { slug, isActive: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: await apiT("api.invalidData") },
      { status: 400 }
    );
  }

  const parsed = createRegistrationSchema(dict).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? (await apiT("api.invalidData")),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const email = data.email.toLowerCase().trim();
  const mobile = normalizeMobile(data.mobile);

  const duplicate = await prisma.registration.findFirst({
    where: {
      eventId: event.id,
      OR: [{ email }, { mobile }],
    },
  });

  if (duplicate) {
    return NextResponse.json(
      { error: await apiT("api.duplicateRegistration") },
      { status: 409 }
    );
  }

  const registration = await prisma.registration.create({
    data: {
      eventId: event.id,
      fullName: data.fullName.trim(),
      rank: data.rank,
      entity: data.entity,
      email,
      mobile,
      notes: data.notes?.trim() || null,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    id: registration.id,
    message: await apiT("api.registrationSuccess"),
  });
}
