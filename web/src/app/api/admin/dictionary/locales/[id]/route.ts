import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, canManageDictionary } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !(await canManageDictionary(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { id } = await params;
  let body: {
    name?: string;
    direction?: string;
    isActive?: boolean;
    isDefault?: boolean;
    sortOrder?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  if (body.isDefault) {
    await prisma.locale.updateMany({ data: { isDefault: false } });
  }

  const locale = await prisma.locale.update({
    where: { id },
    data: {
      name: body.name,
      direction: body.direction,
      isActive: body.isActive,
      isDefault: body.isDefault,
      sortOrder: body.sortOrder,
    },
  });

  revalidateTag("dictionary", "max");
  return NextResponse.json(locale);
}
