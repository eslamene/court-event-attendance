import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { format } from "date-fns";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") || undefined;
  const formatType = searchParams.get("format") || "xlsx";

  const registrations = await prisma.registration.findMany({
    where: eventId ? { eventId } : {},
    orderBy: { createdAt: "desc" },
    include: { event: true },
  });

  const rows = registrations.map((r) => ({
    "اسم الفعالية": r.event.name,
    "تاريخ الفعالية": format(r.event.date, "yyyy-MM-dd"),
    "الاسم الكامل": r.fullName,
    الرتبة: r.rank,
    الجهة: r.entity,
    "البريد الإلكتروني": r.email,
    "رقم الجوال": r.mobile,
    ملاحظات: r.notes ?? "",
    الحالة: REGISTRATION_STATUS_LABELS[r.status] ?? r.status,
    "تاريخ التسجيل": format(r.createdAt, "yyyy-MM-dd HH:mm"),
    "تاريخ الحضور": r.attendedAt ? format(r.attendedAt, "yyyy-MM-dd HH:mm") : "",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "التسجيلات");

  if (formatType === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="registrations.csv"',
      },
    });
  }

  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="registrations.xlsx"',
    },
  });
}
