import { NextResponse } from "next/server";
import { auth, canApprove } from "@/lib/auth";
import { approveRegistration } from "@/lib/approval";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canApprove(session.user.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { registration, notifications } = await approveRegistration(
      id,
      session.user.id
    );
    return NextResponse.json({
      id: registration.id,
      status: registration.status,
      message: "تمت الموافقة وإرسال رمز QR",
      notifications: {
        email: notifications.find((n) => n.channel === "email")?.sent ?? false,
        whatsapp:
          notifications.find((n) => n.channel === "whatsapp")?.sent ?? false,
        sms: notifications.find((n) => n.channel === "sms")?.sent ?? false,
        details: notifications,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشلت العملية";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
