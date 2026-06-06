"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { RolePermission } from "@/lib/role-permissions";

type PermissionsResponse = {
  roleId?: string;
  permissions: RolePermission[];
};

export function useUserPermissions() {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (status !== "authenticated") {
      setPermissions([]);
      setLoading(status === "loading");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/me/permissions");
      const data = (await res.json()) as PermissionsResponse;
      if (res.ok) {
        setPermissions(data.permissions ?? []);
      } else {
        setPermissions([]);
      }
    } catch {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load, session?.user?.roleId]);

  const has = useCallback(
    (permission: RolePermission) => permissions.includes(permission),
    [permissions]
  );

  return { permissions, loading, has, reload: load };
}
