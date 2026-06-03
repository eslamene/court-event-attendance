import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiDict } from "@/lib/i18n/api";
import { translate } from "@/lib/i18n/translate";
import { jsonUnauthorized } from "@/lib/i18n/responses";
import { format } from "date-fns";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return jsonUnauthorized();
  }

  const dict = await apiDict();
  const t = (key: string) => translate(dict, key);

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") || undefined;
  const formatType = searchParams.get("format") || "xlsx";

  const registrations = await prisma.registration.findMany({
    where: eventId ? { eventId } : {},
    orderBy: { createdAt: "desc" },
    include: { event: true },
  });

  const rows = registrations.map((r) => ({
    [t("export.eventName")]: r.event.name,
    [t("export.eventDate")]: format(r.event.date, "yyyy-MM-dd"),
    [t("export.fullName")]: r.fullName,
    [t("export.rank")]: r.rank,
    [t("export.entity")]: r.entity,
    [t("export.email")]: r.email,
    [t("export.mobile")]: r.mobile,
    Notes: r.notes ?? "",
    [t("export.status")]: t(`status.${r.status}`),
    [t("export.registeredAt")]: format(r.createdAt, "yyyy-MM-dd HH:mm"),
    [t("export.attendedAt")]: r.attendedAt
      ? format(r.attendedAt, "yyyy-MM-dd HH:mm")
      : "",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, t("export.sheetName"));

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
