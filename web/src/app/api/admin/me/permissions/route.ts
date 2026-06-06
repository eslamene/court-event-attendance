import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiT } from "@/lib/i18n/api";
import { listRolePermissions } from "@/lib/roles-store";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: await apiT("api.unauthorized") }, { status: 401 });
  }

  const permissions = await listRolePermissions(session.user.roleId);

  return NextResponse.json({
    roleId: session.user.roleId,
    roleCode: session.user.roleCode,
    roleName: session.user.roleName,
    permissions,
  });
}
