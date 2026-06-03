import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { registrationSchema, normalizeMobile } from "@/lib/validators";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug, isActive: true },
  });

  if (!event) {
    return NextResponse.json({ error: "الفعالية غير موجودة" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
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
      {
        error:
          "يوجد تسجيل مسبق بنفس البريد الإلكتروني أو رقم الجوال لهذه الفعالية",
      },
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
    message:
      "تم استلام طلب التسجيل بنجاح. سيتم مراجعته من قبل الإدارة وإبلاغكم عند الموافقة.",
  });
}
